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
        new BadDataException("ClickUp API Token is required."),
      );
    }

    if (!args["list-id"]) {
      throw options.onError(
        new BadDataException("ClickUp List ID is required."),
      );
    }

    if (!args["task-name"]) {
      throw options.onError(
        new BadDataException("Task Name is required."),
      );
    }

    const apiToken: string = args["api-token"].toString().trim();
    const listId: string = args["list-id"].toString().trim();
    const taskName: string = args["task-name"].toString();
    const taskDescription: string | undefined =
      args["task-description"]?.toString();
    const status: string | undefined = args["status"]?.toString();
    const priority: number | undefined = args["priority"]
      ? parseInt(args["priority"].toString(), 10)
      : undefined;

    const requestBody: JSONObject = {
      name: taskName,
    };

    if (taskDescription) {
      requestBody["description"] = taskDescription;
    }

    if (status) {
      requestBody["status"] = status;
    }

    if (priority !== undefined && !isNaN(priority)) {
      requestBody["priority"] = priority;
    }

    try {
      const apiUrl: URL = URL.fromString(
        `https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/task`,
      );

      const result: HTTPResponse<JSONObject> | HTTPErrorResponse | null =
        await API.post({
          url: apiUrl,
          data: requestBody,
          headers: { Authorization: apiToken },
        });

      if (result instanceof HTTPErrorResponse) {
        return {
          returnValues: {
            error:
              (result.data?.["err"] as string) ||
              result.message ||
              "ClickUp API error.",
          },
          executePort: errorPort,
        };
      }

      const taskId: string = (result.data?.["id"] as string) || "";
      const taskUrl: string = `https://app.clickup.com/t/${taskId}`;

      return {
        returnValues: {
          "task-id": taskId,
          "task-url": taskUrl,
        },
        executePort: successPort,
      };
    } catch (err) {
      if (err instanceof HTTPErrorResponse) {
        return {
          returnValues: {
            error:
              (err.data?.["err"] as string) ||
              err.message ||
              "ClickUp API error.",
          },
          executePort: errorPort,
        };
      }

      throw options.onError(
        new APIException("Failed to create ClickUp task."),
      );
    }
  }
}
