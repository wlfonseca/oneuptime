import ExceptionCode from "./ExceptionCode";
import TimeoutException from "./TimeoutException";

export default class QueryTimeoutException extends TimeoutException {
  public constructor(message: string) {
    super(message);
    this.code = ExceptionCode.QueryTimeoutException;
  }
}
