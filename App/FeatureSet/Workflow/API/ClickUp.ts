import BadDataException from "Common/Types/Exception/BadDataException";
import { JSONObject } from "Common/Types/JSON";
import URL from "Common/Types/API/URL";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import Headers from "Common/Types/API/Headers";
import API from "Common/Utils/API";
import UserMiddleware from "Common/Server/Middleware/UserAuthorization";
import Express, {
  ExpressRequest,
  ExpressResponse,
  ExpressRouter,
  NextFunction,
} from "Common/Server/Utils/Express";
import Response from "Common/Server/Utils/Response";

export default class ClickUpAPI {
  public router!: ExpressRouter;

  public constructor() {
    this.router = Express.getRouter();

    this.router.get(
      `/clickup/fields`,
      UserMiddleware.getUserMiddleware,
      this.getListFields,
    );
  }

  public async getListFields(
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction,
  ): Promise<void> {
    try {
      const apiToken: string | undefined = (
        req.query["apiToken"] as string | undefined
      )?.trim();
      const listId: string | undefined = req.query["listId"] as
        | string
        | undefined;

      if (!apiToken) {
        return Response.sendErrorResponse(
          req,
          res,
          new BadDataException("apiToken is required"),
        );
      }

      if (!listId) {
        return Response.sendErrorResponse(
          req,
          res,
          new BadDataException("listId is required"),
        );
      }

      const clickupUrl: URL = URL.fromString(
        `https://api.clickup.com/api/v2/list/${listId}/field`,
      );

      const result: HTTPResponse<JSONObject> | HTTPErrorResponse | null =
        await API.get({
          url: clickupUrl,
          headers: { Authorization: apiToken } as Headers,
        });

      if (result instanceof HTTPErrorResponse) {
        return Response.sendErrorResponse(
          req,
          res,
          new BadDataException(
            (result.data?.["err"] as string) ||
              result.message ||
              "Failed to fetch ClickUp fields",
          ),
        );
      }

      const fields: Array<JSONObject> =
        (result.data?.["fields"] as Array<JSONObject> | undefined) || [];

      return Response.sendJsonObjectResponse(req, res, { fields });
    } catch (err) {
      next(err);
    }
  }
}
