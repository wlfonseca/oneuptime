import ComponentCode, { RunOptions, RunReturnType } from "../../ComponentCode";
import Headers from "../../../../../Types/API/Headers";
import HTTPErrorResponse from "../../../../../Types/API/HTTPErrorResponse";
import HTTPResponse from "../../../../../Types/API/HTTPResponse";
import URL from "../../../../../Types/API/URL";
import APIException from "../../../../../Types/Exception/ApiException";
import BadDataException from "../../../../../Types/Exception/BadDataException";
import { JSONObject } from "../../../../../Types/JSON";
import ComponentMetadata, {
  Port,
} from "../../../../../Types/Workflow/Component";
import ComponentID from "../../../../../Types/Workflow/ComponentID";
import ClickUpComponents from "../../../../../Types/Workflow/Components/ClickUp";
import API from "../../../../../Utils/API";
import CaptureSpan from "../../../../Utils/Telemetry/CaptureSpan";

export default class CreateTask extends ComponentCode {
  public constructor() {
    super();

    const Component: ComponentMetadata | undefined = ClickUpComponents.find(
      (i: ComponentMetadata) => {
        return i.id === ComponentID.ClickUpCreateTask;
      },
    );

    if (!Component) {
      throw new BadDataException("Component not found.");
    }

    this.setMetadata(Component);
  }

  @CaptureSpan()
  public override async run(
    args: JSONObject,
    options: RunOptions,
  ): Promise<RunReturnType> {
    const successPort: Port | undefined = this.getMetadata().outPorts.find(
      (p: Port) => {
        return p.id === "success";
      },
    );

    if (!successPort) {
      throw options.onError(new BadDataException("Success port not found"));
    }

    const duplicatePort: Port | undefined = this.getMetadata().outPorts.find(
      (p: Port) => {
        return p.id === "duplicate";
      },
    );

    const errorPort: Port | undefined = this.getMetadata().outPorts.find(
      (p: Port) => {
        return p.id === "error";
      },
    );

    if (!errorPort) {
      throw options.onError(new BadDataException("Error port not found"));
    }

    if (!args["api-token"]) {
      throw options.onError(
        new BadDataException("ClickUp API Token not found"),
      );
    }

    if (!args["list-url"]) {
      throw options.onError(new BadDataException("ClickUp List URL not found"));
    }

    if (!args["task-name"]) {
      throw options.onError(
        new BadDataException("ClickUp task name not found"),
      );
    }

    const apiToken: string = args["api-token"]?.toString() as string;
    const listUrl: string = args["list-url"]?.toString() as string;
    const taskName: string = args["task-name"]?.toString() as string;
    const taskDescription: string | undefined =
      args["task-description"]?.toString();
    const statusInput: string | undefined = args["status"]?.toString();
    const priorityInput: number | undefined = args["priority"]
      ? parseInt(args["priority"]?.toString() as string)
      : undefined;
    const dedupKey: string | undefined = args["dedup-key"]?.toString();
    const dedupFieldId: string | undefined = args["dedup-field-id"]?.toString();
    const counterFieldId: string | undefined =
      args["counter-field-id"]?.toString();

    const listUrlParts: string[] = listUrl.split("/");
    const liIndex: number = listUrlParts.indexOf("li");
    let listId: string = "";

    if (liIndex !== -1 && liIndex + 1 < listUrlParts.length) {
      listId = listUrlParts[liIndex + 1]?.split("?")[0]?.split("#")[0] || "";
    }

    if (!listId) {
      const numericParts: string[] = listUrlParts.filter((p: string) =>
        /^\d+$/.test(p),
      );
      listId =
        numericParts.length > 0
          ? (numericParts[numericParts.length - 1] as string)
          : "";
    }

    if (!listId) {
      throw options.onError(
        new BadDataException(
          "Could not extract List ID from the provided URL. Make sure it's a valid ClickUp list URL like https://app.clickup.com/123456/v/li/987654",
        ),
      );
    }

    const requestBody: JSONObject = {
      name: taskName,
    };

    if (taskDescription) {
      requestBody["description"] = taskDescription;
    }

    if (statusInput) {
      requestBody["status"] = statusInput;
    }

    if (priorityInput !== undefined && !isNaN(priorityInput)) {
      requestBody["priority"] = priorityInput;
    }

    try {
      if (dedupKey && dedupFieldId) {
        const searchResult = await this.findExistingTask(
          apiToken,
          listId,
          dedupFieldId,
          dedupKey,
          options,
        );

        if (searchResult) {
          return await this.handleDuplicate(
            apiToken,
            searchResult,
            dedupKey,
            counterFieldId,
            duplicatePort,
            successPort,
            errorPort,
            options,
          );
        }
      }

      const customFieldsStr: string | undefined =
        args["custom-fields"]?.toString();
      if (customFieldsStr) {
        try {
          const parsed: JSONObject = JSON.parse(customFieldsStr);
          requestBody["custom_fields"] = parsed;
        } catch (_e) {
          throw options.onError(
            new BadDataException("Invalid Custom Fields JSON format."),
          );
        }
      }

      const clickupApiUrl: URL = URL.fromString(
        `https://api.clickup.com/api/v2/list/${listId}/task`,
      );

      const apiResult: HTTPResponse<JSONObject> | HTTPErrorResponse | null =
        await API.post({
          url: clickupApiUrl,
          data: requestBody,
          headers: { Authorization: apiToken } as Headers,
        });

      if (apiResult instanceof HTTPErrorResponse) {
        const clickupError: string =
          (apiResult.data?.["err"] as string) ||
          apiResult.message ||
          "Server Error.";
        return Promise.resolve({
          returnValues: {
            error: clickupError,
          },
          executePort: errorPort,
        });
      }

      const taskId: string = (apiResult.data?.["id"] as string) || "";
      const resultTaskUrl: string = `https://app.clickup.com/t/${taskId}`;

      if (dedupKey && dedupFieldId) {
        await this.setCustomField(apiToken, taskId, dedupFieldId, dedupKey);
      }

      if (counterFieldId) {
        await this.setCustomField(apiToken, taskId, counterFieldId, 1);
      }

      return Promise.resolve({
        returnValues: {
          "task-id": taskId,
          "task-url": resultTaskUrl,
          duplicate: false,
          "event-count": 1,
        },
        executePort: successPort,
      });
    } catch (err) {
      if (err instanceof HTTPErrorResponse) {
        const clickupError: string =
          (err.data?.["err"] as string) || err.message || "Server Error.";
        return Promise.resolve({
          returnValues: {
            error: clickupError,
          },
          executePort: errorPort,
        });
      }

      throw options.onError(new APIException("Something wrong happened."));
    }
  }

  private async findExistingTask(
    apiToken: string,
    listId: string,
    fieldId: string,
    value: string,
    _options: RunOptions,
  ): Promise<string | null> {
    const searchUrl: URL = URL.fromString(
      `https://api.clickup.com/api/v2/list/${listId}/task?custom_fields=[{"field_id":"${fieldId}","operator":"=","value":"${value}"}]`,
    );

    const result: HTTPResponse<JSONObject> | HTTPErrorResponse | null =
      await API.get({
        url: searchUrl,
        headers: { Authorization: apiToken },
      });

    if (result instanceof HTTPErrorResponse) {
      return null;
    }

    const tasks: Array<JSONObject> =
      (result.data?.["tasks"] as Array<JSONObject>) || [];

    if (tasks.length > 0) {
      return tasks[0]?.["id"] as string;
    }

    return null;
  }

  private async handleDuplicate(
    apiToken: string,
    taskId: string,
    dedupKey: string,
    counterFieldId: string | undefined,
    duplicatePort: Port | undefined,
    successPort: Port | undefined,
    _errorPort: Port | undefined,
    _options: RunOptions,
  ): Promise<RunReturnType> {
    let eventCount: number = 1;

    if (counterFieldId) {
      eventCount = await this.getCustomFieldValue(
        apiToken,
        taskId,
        counterFieldId,
      );

      eventCount = typeof eventCount === "number" ? eventCount + 1 : 2;

      await this.setCustomField(apiToken, taskId, counterFieldId, eventCount);
    }

    const commentText: string = `Evento identificado novamente (${eventCount}ª vez). Chave: ${dedupKey}`;
    await this.postComment(apiToken, taskId, commentText);

    const taskUrl: string = `https://app.clickup.com/t/${taskId}`;

    if (duplicatePort) {
      return Promise.resolve({
        returnValues: {
          "task-id": taskId,
          "task-url": taskUrl,
          duplicate: true,
          "event-count": eventCount,
        },
        executePort: duplicatePort,
      });
    }

    return Promise.resolve({
      returnValues: {
        "task-id": taskId,
        "task-url": taskUrl,
        duplicate: true,
        "event-count": eventCount,
      },
      executePort: successPort,
    });
  }

  private async getCustomFieldValue(
    apiToken: string,
    taskId: string,
    fieldId: string,
  ): Promise<number> {
    const taskUrl: URL = URL.fromString(
      `https://api.clickup.com/api/v2/task/${taskId}`,
    );

    const result: HTTPResponse<JSONObject> | HTTPErrorResponse | null =
      await API.get({
        url: taskUrl,
        headers: { Authorization: apiToken },
      });

    if (result instanceof HTTPErrorResponse) {
      return 0;
    }

    const customFields: Array<JSONObject> =
      (result.data?.["custom_fields"] as Array<JSONObject>) || [];
    const field: JSONObject | undefined = customFields.find((f: JSONObject) => {
      return f["id"] === fieldId;
    });

    if (field && field["value"] !== undefined && field["value"] !== null) {
      const val: number = Number(field["value"]);
      return isNaN(val) ? 0 : val;
    }

    return 1;
  }

  private async setCustomField(
    apiToken: string,
    taskId: string,
    fieldId: string,
    value: string | number,
  ): Promise<void> {
    const fieldUrl: URL = URL.fromString(
      `https://api.clickup.com/api/v2/task/${taskId}/field/${fieldId}`,
    );

    await API.post({
      url: fieldUrl,
      data: { value },
      headers: { Authorization: apiToken },
    });
  }

  private async postComment(
    apiToken: string,
    taskId: string,
    text: string,
  ): Promise<void> {
    const commentUrl: URL = URL.fromString(
      `https://api.clickup.com/api/v2/task/${taskId}/comment`,
    );

    await API.post({
      url: commentUrl,
      data: { comment_text: text },
      headers: { Authorization: apiToken },
    });
  }
}
