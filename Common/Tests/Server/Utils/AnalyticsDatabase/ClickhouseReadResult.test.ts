import { ClickHouseError } from "@clickhouse/client";
import ClickhouseReadResult from "../../../../Server/Utils/AnalyticsDatabase/ClickhouseReadResult";
import QueryTimeoutException from "../../../../Types/Exception/QueryTimeoutException";
import ServerException from "../../../../Types/Exception/ServerException";

const TIMEOUT_TEXT: string =
  "Code: 159. DB::Exception: Timeout exceeded: elapsed 45.1 seconds, maximum: 45. (TIMEOUT_EXCEEDED) (version 26.7.13.12 (official build))";

const whole: string = JSON.stringify({ data: [{ count: "3" }], rows: 1 });

describe("ClickhouseReadResult", () => {
  describe("readJson", () => {
    test("returns a whole document", () => {
      expect(ClickhouseReadResult.readJson(whole, {})).toEqual({
        data: [{ count: "3" }],
        rows: 1,
      });
    });

    test("an empty body with a time limit is a QueryTimeoutException", () => {
      expect(() => {
        return ClickhouseReadResult.readJson("", { timeLimitInSeconds: 45 });
      }).toThrow(QueryTimeoutException);
    });

    test("a document cut off mid-row with a time limit is a QueryTimeoutException", () => {
      expect(() => {
        return ClickhouseReadResult.readJson(whole.substring(0, 20), {
          timeLimitInSeconds: 45,
        });
      }).toThrow(
        "This query took longer than 45 seconds and was stopped before it finished.",
      );
    });

    test("an empty body without a time limit is a ServerException", () => {
      expect(() => {
        return ClickhouseReadResult.readJson("", {});
      }).toThrow(ServerException);
    });

    test("an __exception__ block after the rows is a QueryTimeoutException", () => {
      const body: string = `{"data":[{"a":1},\r\n__exception__\r\ntag123\r\n${TIMEOUT_TEXT}\n\r\n${TIMEOUT_TEXT.length} tag123\r\n__exception__\r\n`;

      expect(() => {
        return ClickhouseReadResult.readJson(body, {
          timeLimitInSeconds: 45,
          exceptionTag: "tag123",
        });
      }).toThrow(QueryTimeoutException);
    });

    test("an __exception__ block with another code is a ClickHouseError with its code", () => {
      const text: string =
        "Code: 241. DB::Exception: Memory limit exceeded (MEMORY_LIMIT_EXCEEDED) (version 26.7)";
      const body: string = `{"data":[\r\n__exception__\r\ntag1\r\n${text}\n\r\n${text.length} tag1\r\n__exception__\r\n`;

      let caught: any;

      try {
        ClickhouseReadResult.readJson(body, {
          timeLimitInSeconds: 45,
          exceptionTag: "tag1",
        });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(ClickHouseError);
      expect(caught.code).toBe("241");
      expect(caught.type).toBe("MEMORY_LIMIT_EXCEEDED");
    });

    test("a 24.x document with an exception member is a QueryTimeoutException", () => {
      const body: string = JSON.stringify({
        data: [{ a: 1 }],
        rows: 1,
        exception: TIMEOUT_TEXT,
      });

      expect(() => {
        return ClickhouseReadResult.readJson(body, { timeLimitInSeconds: 45 });
      }).toThrow(QueryTimeoutException);
    });
  });

  describe("toReadError", () => {
    test("an HTTP 408 with code 159 becomes a QueryTimeoutException", () => {
      const error: ClickHouseError = new ClickHouseError({
        code: "159",
        type: "TIMEOUT_EXCEEDED",
        message: TIMEOUT_TEXT,
      });

      const result: unknown = ClickhouseReadResult.toReadError(error, {
        timeLimitInSeconds: 45,
      });

      expect(result).toBeInstanceOf(QueryTimeoutException);
      expect((result as QueryTimeoutException).code).toBe(504);
    });

    test("code 160 becomes a QueryTimeoutException", () => {
      const error: ClickHouseError = new ClickHouseError({
        code: "160",
        type: "TOO_SLOW",
        message: "Code: 160. DB::Exception: too slow (TOO_SLOW)",
      });

      expect(ClickhouseReadResult.toReadError(error)).toBeInstanceOf(
        QueryTimeoutException,
      );
    });

    test("other errors are left as they are", () => {
      const error: Error = new Error("boom");

      expect(ClickhouseReadResult.toReadError(error)).toBe(error);
    });
  });

  describe("guard", () => {
    test("json() on an empty body throws a QueryTimeoutException", async () => {
      const guarded: any = ClickhouseReadResult.guard(
        { text: async () => "", json: async () => JSON.parse("") },
        { timeLimitInSeconds: 45 },
      );

      await expect(guarded.json()).rejects.toBeInstanceOf(
        QueryTimeoutException,
      );
    });

    test("json() on a whole document returns it", async () => {
      const guarded: any = ClickhouseReadResult.guard(
        { text: async () => whole, json: async () => JSON.parse(whole) },
        { timeLimitInSeconds: 45 },
      );

      await expect(guarded.json()).resolves.toEqual({
        data: [{ count: "3" }],
        rows: 1,
      });
    });

    test("a result set without text() has a SyntaxError read as an incomplete answer", async () => {
      const guarded: any = ClickhouseReadResult.guard(
        { json: async () => JSON.parse("") },
        { timeLimitInSeconds: 45 },
      );

      await expect(guarded.json()).rejects.toBeInstanceOf(
        QueryTimeoutException,
      );
    });
  });

  describe("getTimeLimitInSeconds", () => {
    test("reads the last max_execution_time from the statement", () => {
      expect(
        ClickhouseReadResult.getTimeLimitInSeconds(
          "SELECT 1 SETTINGS max_execution_time = 45, timeout_overflow_mode = 'break'",
        ),
      ).toBe(45);
    });

    test("falls back to the per-call setting", () => {
      expect(
        ClickhouseReadResult.getTimeLimitInSeconds("SELECT 1", {
          max_execution_time: 1800,
        }),
      ).toBe(1800);
    });

    test("is undefined without one", () => {
      expect(
        ClickhouseReadResult.getTimeLimitInSeconds("SELECT 1"),
      ).toBeUndefined();
    });
  });
});
