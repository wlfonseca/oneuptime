import { ClickHouseError, ClickHouseSettings } from "@clickhouse/client";
import QueryTimeoutException from "../../../Types/Exception/QueryTimeoutException";
import ServerException from "../../../Types/Exception/ServerException";

const TIME_LIMIT_ERROR_CODES: ReadonlyArray<string> = ["159", "160"];
const TIME_LIMIT_ERROR_TYPES: ReadonlyArray<string> = [
  "TIMEOUT_EXCEEDED",
  "TOO_SLOW",
];

const EXCEPTION_MARKER: string = "__exception__";

const MAX_EXECUTION_TIME_SETTING: string = "max_execution_time";

const ERROR_TYPE_PATTERN: RegExp = /^[A-Z][A-Z0-9_]{2,}$/;

export interface ClickhouseErrorDetails {
  code: string;
  type: string;
  message: string;
}

export interface ClickhouseReadOptions {
  timeLimitInSeconds?: number | undefined;
}

type ResponseHeaderValues = Record<string, string | Array<string> | undefined>;

interface JsonReadableResultSet {
  json: () => Promise<unknown>;
  text?: (() => Promise<string>) | undefined;
  response_headers?: ResponseHeaderValues | undefined;
}

export default class ClickhouseReadResult {
  public static isTimeLimitError(error: unknown): boolean {
    if (error instanceof QueryTimeoutException) {
      return true;
    }

    if (!error || typeof error !== "object") {
      return false;
    }

    const code: unknown = (error as { code?: unknown }).code;
    const type: unknown = (error as { type?: unknown }).type;

    return (
      (typeof code === "string" && TIME_LIMIT_ERROR_CODES.includes(code)) ||
      (typeof type === "string" && TIME_LIMIT_ERROR_TYPES.includes(type))
    );
  }

  public static getTimeLimitInSeconds(
    query: string,
    clickhouseSettings?: ClickHouseSettings | undefined,
  ): number | undefined {
    const fromQuery: number | undefined =
      ClickhouseReadResult.readSettingFromQuery(query);

    if (fromQuery !== undefined) {
      return fromQuery;
    }

    const fromSettings: unknown = clickhouseSettings?.max_execution_time;

    if (fromSettings === undefined || fromSettings === null) {
      return undefined;
    }

    const seconds: number = Number(fromSettings);

    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
  }

  public static getTimeLimitMessage(timeLimitInSeconds?: number): string {
    const took: string =
      timeLimitInSeconds !== undefined
        ? `took longer than ${ClickhouseReadResult.formatSeconds(timeLimitInSeconds)}`
        : "took too long";

    return `This query ${took} and was stopped before it finished. Try a shorter time range or more specific filters.`;
  }

  public static toTimeLimitException(
    timeLimitInSeconds?: number,
  ): QueryTimeoutException {
    return new QueryTimeoutException(
      ClickhouseReadResult.getTimeLimitMessage(timeLimitInSeconds),
    );
  }

  public static toReadError(
    error: unknown,
    options: ClickhouseReadOptions = {},
  ): unknown {
    if (error instanceof QueryTimeoutException) {
      return error;
    }

    if (ClickhouseReadResult.isTimeLimitError(error)) {
      return ClickhouseReadResult.toTimeLimitException(
        options.timeLimitInSeconds,
      );
    }

    return error;
  }

  public static parseErrorText(text: string): ClickhouseErrorDetails | null {
    const codeStart: number = text.indexOf("Code: ");

    if (codeStart < 0) {
      return null;
    }

    let codeEnd: number = codeStart + "Code: ".length;
    let code: string = "";

    while (codeEnd < text.length) {
      const character: string = text.charAt(codeEnd);

      if (character < "0" || character > "9") {
        break;
      }

      code += character;
      codeEnd++;
    }

    if (!code) {
      return null;
    }

    return {
      code: code,
      type: ClickhouseReadResult.readErrorType(text, codeEnd),
      message: text.substring(codeStart).trim(),
    };
  }

  public static readJson<T = unknown>(
    text: string,
    options: ClickhouseReadOptions & {
      exceptionTag?: string | undefined;
    } = {},
  ): T {
    let document: unknown = undefined;
    let isWhole: boolean = false;

    try {
      document = JSON.parse(text);
      isWhole = true;
    } catch {
      isWhole = false;
    }

    if (isWhole) {
      ClickhouseReadResult.throwIfDocumentCarriesError(document, options);
      return document as T;
    }

    const trailingError: ClickhouseErrorDetails | null =
      ClickhouseReadResult.readTrailingError(text, options.exceptionTag);

    if (trailingError) {
      throw ClickhouseReadResult.toReadError(
        ClickhouseReadResult.toClickhouseError(trailingError),
        options,
      );
    }

    throw ClickhouseReadResult.toIncompleteAnswerError(options);
  }

  public static guard<TResultSet>(
    resultSet: TResultSet,
    options: ClickhouseReadOptions = {},
  ): TResultSet {
    if (!resultSet || typeof resultSet !== "object") {
      return resultSet;
    }

    const readable: JsonReadableResultSet =
      resultSet as unknown as JsonReadableResultSet;

    if (typeof readable.json !== "function") {
      return resultSet;
    }

    const readText: (() => Promise<string>) | null =
      typeof readable.text === "function"
        ? readable.text.bind(resultSet)
        : null;
    const readDocument: () => Promise<unknown> = readable.json.bind(resultSet);

    readable.json = async (): Promise<unknown> => {
      if (!readText) {
        let document: unknown;

        try {
          document = await readDocument();
        } catch (error) {
          throw error instanceof SyntaxError
            ? ClickhouseReadResult.toIncompleteAnswerError(options)
            : ClickhouseReadResult.toReadError(error, options);
        }

        ClickhouseReadResult.throwIfDocumentCarriesError(document, options);
        return document;
      }

      let text: string;

      try {
        text = await readText();
      } catch (error) {
        throw ClickhouseReadResult.toReadError(error, options);
      }

      return ClickhouseReadResult.readJson(text, {
        ...options,
        exceptionTag: ClickhouseReadResult.readHeader(
          readable.response_headers,
          "x-clickhouse-exception-tag",
        ),
      });
    };

    return resultSet;
  }

  private static throwIfDocumentCarriesError(
    document: unknown,
    options: ClickhouseReadOptions,
  ): void {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return;
    }

    const exception: unknown = (document as { exception?: unknown }).exception;

    if (typeof exception !== "string" || !exception.trim()) {
      return;
    }

    const details: ClickhouseErrorDetails = ClickhouseReadResult.parseErrorText(
      exception,
    ) || { code: "", type: "", message: exception.trim() };

    throw ClickhouseReadResult.toReadError(
      ClickhouseReadResult.toClickhouseError(details),
      options,
    );
  }

  private static toIncompleteAnswerError(
    options: ClickhouseReadOptions,
  ): Error {
    if (options.timeLimitInSeconds !== undefined) {
      return ClickhouseReadResult.toTimeLimitException(
        options.timeLimitInSeconds,
      );
    }

    return new ServerException(
      "The database's answer to this query ended before it was complete.",
    );
  }

  private static readTrailingError(
    text: string,
    exceptionTag: string | undefined,
  ): ClickhouseErrorDetails | null {
    const body: string = text.trimEnd();

    if (!body.endsWith(EXCEPTION_MARKER)) {
      return null;
    }

    const closingMarker: number = body.length - EXCEPTION_MARKER.length;
    const openingMarker: number = body.lastIndexOf(
      EXCEPTION_MARKER,
      closingMarker - 1,
    );

    if (openingMarker < 0) {
      return null;
    }

    const lines: Array<string> = ClickhouseReadResult.toLines(
      body.substring(openingMarker + EXCEPTION_MARKER.length, closingMarker),
    );

    if (lines.length < 3) {
      return null;
    }

    if (
      exceptionTag &&
      (lines[0] !== exceptionTag ||
        !lines[lines.length - 1]!.endsWith(` ${exceptionTag}`))
    ) {
      return null;
    }

    return ClickhouseReadResult.parseErrorText(lines.slice(1, -1).join("\n"));
  }

  private static toLines(text: string): Array<string> {
    return text
      .split("\n")
      .map((line: string): string => {
        return line.endsWith("\r") ? line.substring(0, line.length - 1) : line;
      })
      .filter((line: string): boolean => {
        return line.length > 0;
      });
  }

  private static toClickhouseError(
    details: ClickhouseErrorDetails,
  ): ClickHouseError {
    return new ClickHouseError({
      code: details.code,
      type: details.type,
      message: details.message,
    });
  }

  private static readErrorType(text: string, from: number): string {
    let close: number = text.lastIndexOf(")");

    while (close > from) {
      const open: number = text.lastIndexOf("(", close);

      if (open < from) {
        return "";
      }

      const word: string = text.substring(open + 1, close);

      if (ERROR_TYPE_PATTERN.test(word)) {
        return word;
      }

      close = text.lastIndexOf(")", open);
    }

    return "";
  }

  private static readSettingFromQuery(query: string): number | undefined {
    const at: number = query.lastIndexOf(MAX_EXECUTION_TIME_SETTING);

    if (at < 0) {
      return undefined;
    }

    let index: number = at + MAX_EXECUTION_TIME_SETTING.length;

    while (query.charAt(index) === " ") {
      index++;
    }

    if (query.charAt(index) !== "=") {
      return undefined;
    }

    index++;

    while (query.charAt(index) === " ") {
      index++;
    }

    let digits: string = "";

    while (query.charAt(index) >= "0" && query.charAt(index) <= "9") {
      digits += query.charAt(index);
      index++;
    }

    const seconds: number = Number(digits);

    return digits && seconds > 0 ? seconds : undefined;
  }

  private static readHeader(
    headers: ResponseHeaderValues | undefined,
    name: string,
  ): string | undefined {
    const value: string | Array<string> | undefined = headers?.[name];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value || undefined;
  }

  private static formatSeconds(seconds: number): string {
    return seconds === 1 ? "1 second" : `${seconds} seconds`;
  }
}
