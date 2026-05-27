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

export default class UpdateTask extends ComponentCode {
  public constructor() {
    super();

    const Component: ComponentMetadata | undefined = ClickUpComponents.find(
      (i: ComponentMetadata) => {
        return i.id === ComponentID.ClickUpUpdateTask;
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

    const notFoundPort: Port | undefined = this.getMetadata().outPorts.find(
      (p: Port) => {
        return p.id === "not-found";
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

    if (!args["status"]) {
      throw options.onError(
        new BadDataException("ClickUp task status not found"),
      );
    }

    const apiToken: string = (args["api-token"]?.toString() as string).trim();
    const statusInput: string = args["status"]?.toString() as string;
    const commentInput: string | undefined = args["comment"]?.toString();
    const taskUrl: string | undefined = args["task-url"]?.toString();
    const dedupKey: string | undefined = args["dedup-key"]?.toString();
    const dedupFieldId: string | undefined = args["dedup-field-id"]?.toString();
    const listUrl: string | undefined = args["list-url"]?.toString();

    let taskId: string = "";

    if (taskUrl) {
      const taskUrlParts: string[] = taskUrl.split("/");
      const tIndex: number = taskUrlParts.indexOf("t");
      if (tIndex !== -1 && tIndex + 1 < taskUrlParts.length) {
        taskId = taskUrlParts[tIndex + 1]?.split("?")[0]?.split("#")[0] || "";
      }
    } else if (dedupKey && dedupFieldId && listUrl) {
      const listUrlParts: string[] = listUrl.split("/");
      const liIndex: number = listUrlParts.indexOf("li");
      let listId: string = "";
      if (liIndex !== -1 && liIndex + 1 < listUrlParts.length) {
        listId = listUrlParts[liIndex + 1]?.split("?")[0]?.split("#")[0] || "";
      }

      if (!listId) {
        throw options.onError(
          new BadDataException(
            "Could not extract List ID from the provided URL.",
          ),
        );
      }

      const foundId: string | null = await this.findTaskByDedupKey(
        apiToken,
        listId,
        dedupFieldId,
        dedupKey,
      );

      if (!foundId) {
        return Promise.resolve({
          returnValues: {
            "not-found": true,
          },
          executePort: notFoundPort || successPort,
        });
      }

      taskId = foundId;
    }

    if (!taskId) {
      throw options.onError(
        new BadDataException(
          "Could not determine Task ID. Provide a Task URL or a Deduplication Key + List URL.",
        ),
      );
    }

    const clickupApiUrl: URL = URL.fromString(
      `https://api.clickup.com/api/v2/task/${taskId}`,
    );

    try {
      const apiResult: HTTPResponse<JSONObject> | HTTPErrorResponse | null =
        await API.put({
          url: clickupApiUrl,
          data: { status: statusInput },
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

      if (commentInput) {
        const commentUrl: URL = URL.fromString(
          `https://api.clickup.com/api/v2/task/${taskId}/comment`,
        );

        try {
          await API.post({
            url: commentUrl,
            data: { comment_text: commentInput },
            headers: { Authorization: apiToken } as Headers,
          });
        } catch (_commentErr) {
          // comment is optional, ignore errors
        }
      }

      const resultTaskUrl: string = `https://app.clickup.com/t/${taskId}`;

      return Promise.resolve({
        returnValues: {
          "task-id": taskId,
          "task-url": resultTaskUrl,
          "not-found": false,
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

  private async findTaskByDedupKey(
    apiToken: string,
    listId: string,
    fieldId: string,
    value: string,
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
}
