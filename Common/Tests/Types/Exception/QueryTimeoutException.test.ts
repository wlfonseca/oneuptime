import QueryTimeoutException from "../../../Types/Exception/QueryTimeoutException";
import TimeoutException from "../../../Types/Exception/TimeoutException";
import Response from "../../../Server/Utils/Response";

describe("QueryTimeoutException", () => {
  test("is a TimeoutException", () => {
    expect(new QueryTimeoutException("slow")).toBeInstanceOf(TimeoutException);
  });

  test("carries 504, not 408", () => {
    expect(new QueryTimeoutException("slow").code).toBe(504);
  });

  test("is answered with HTTP 504 and its message", () => {
    const send: jest.Mock = jest.fn();
    const status: jest.Mock = jest.fn().mockReturnValue({ send });
    const res: any = { status };

    Response.sendErrorResponse(
      {} as any,
      res,
      new QueryTimeoutException("slow"),
    );

    expect(status).toHaveBeenCalledWith(504);
    expect(send).toHaveBeenCalledWith({ message: "slow" });
  });
});
