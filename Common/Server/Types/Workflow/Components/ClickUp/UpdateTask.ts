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
        new BadDataException("ClickUp API Token not found"),
      );
    }

    if (!args["task-url"]) {
      throw options.onError(new BadDataException("ClickUp Task URL not found"));
    }

    if (!args["status"]) {
      throw options.onError(
        new BadDataException("ClickUp task status not found"),
      );
    }

    const apiToken: string = args["api-token"]?.toString() as string;
    const taskUrl: string = args["task-url"]?.toString() as string;

    const taskUrlParts: string[] = taskUrl.split("/");
    const tIndex: number = taskUrlParts.indexOf("t");
    let taskId: string = "";

    if (tIndex !== -1 && tIndex + 1 < taskUrlParts.length) {
      taskId = taskUrlParts[tIndex + 1]?.split("?")[0]?.split("#")[0] || "";
    }

    if (!taskId) {
      throw options.onError(
        new BadDataException(
          "Could not extract Task ID from the provided URL. Make sure it's a valid ClickUp task URL like https://app.clickup.com/t/86ahk2zrg",
        ),
      );
    }

    const statusInput: string = args["status"]?.toString() as string;
    const commentInput: string | undefined = args["comment"]?.toString();

    const clickupApiUrl: URL = URL.fromString(
      `https://api.clickup.com/api/v2/task/${taskId}`,
    );

    const requestBody: JSONObject = {
      status: statusInput,
    };

    let apiResult: HTTPResponse<JSONObject> | HTTPErrorResponse | null = null;

    try {
      apiResult = await API.put({
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

      if (commentInput) {
        const commentUrl: URL = URL.fromString(
          `https://api.clickup.com/api/v2/task/${taskId}/comment`,
        );

        try {
          await API.post({
            url: commentUrl,
            data: { comment_text: commentInput },
            headers: {
              Authorization: apiToken,
            },
          });
        } catch (_commentErr) {
          // comment is optional, ignore errors
        }
      }

      return Promise.resolve({
        returnValues: {
          "task-id": taskId,
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
