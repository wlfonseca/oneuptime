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

    if (!args["task-id"]) {
      throw options.onError(
        new BadDataException("Task ID is required."),
      );
    }

    if (!args["status"]) {
      throw options.onError(
        new BadDataException("Status is required."),
      );
    }

    const apiToken: string = args["api-token"].toString().trim();
    const taskId: string = args["task-id"].toString().trim();
    const status: string = args["status"].toString();
    const comment: string | undefined = args["comment"]?.toString();

    try {
      const apiUrl: URL = URL.fromString(
        `https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`,
      );

      const result: HTTPResponse<JSONObject> | HTTPErrorResponse | null =
        await API.put({
          url: apiUrl,
          data: { status },
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

      if (comment) {
        const commentUrl: URL = URL.fromString(
          `https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/comment`,
        );

        await API.post({
          url: commentUrl,
          data: { comment_text: comment },
          headers: { Authorization: apiToken },
        });
      }

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
        new APIException("Failed to update ClickUp task."),
      );
    }
  }
}
