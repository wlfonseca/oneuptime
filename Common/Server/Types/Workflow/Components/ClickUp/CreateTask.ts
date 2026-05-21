import ComponentCode, { RunOptions, RunReturnType } from "../../ComponentCode";
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

    const listUrlParts: string[] = listUrl.split("/");
    const liIndex: number = listUrlParts.indexOf("li");
    let listId: string = "";

    if (liIndex !== -1 && liIndex + 1 < listUrlParts.length) {
      listId = listUrlParts[liIndex + 1]?.split("?")[0]?.split("#")[0] || "";
    }

    if (!listId) {
      throw options.onError(
        new BadDataException(
          "Could not extract List ID from the provided URL. Make sure it's a valid ClickUp list URL like https://app.clickup.com/123456/v/li/987654",
        ),
      );
    }

    const taskName: string = args["task-name"]?.toString() as string;
    const taskDescription: string | undefined =
      args["task-description"]?.toString();
    const statusInput: string | undefined = args["status"]?.toString();
    const priorityInput: number | undefined = args["priority"]
      ? parseInt(args["priority"]?.toString() as string)
      : undefined;

    const clickupApiUrl: URL = URL.fromString(
      `https://api.clickup.com/api/v2/list/${listId}/task`,
    );

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

    let apiResult: HTTPResponse<JSONObject> | HTTPErrorResponse | null = null;

    try {
      apiResult = await API.post({
        url: clickupApiUrl,
        data: requestBody,
        headers: {
          Authorization: apiToken,
        },
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
      const taskUrl: string = `https://app.clickup.com/t/${taskId}`;

      return Promise.resolve({
        returnValues: {
          "task-id": taskId,
          "task-url": taskUrl,
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
}
