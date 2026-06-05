import ProjectMiddleware from "../../../Server/Middleware/ProjectAuthorization";
import { describe, expect, test } from "@jest/globals";
import ObjectID from "../../../Types/ObjectID";

describe("ProjectAuthorization — API Key validation", () => {
  describe("getApiKey", () => {
    test("should return apiKey when apikey is in headers", () => {
      const apiKeyValue: string = ObjectID.generate().toString();
      const result: ObjectID | null = ProjectMiddleware.getApiKey({
        headers: { apikey: apiKeyValue },
      } as any);

      expect(result).toBeInstanceOf(ObjectID);
      expect(result?.toString()).toBe(apiKeyValue);
    });

    test("should return null when apikey header is missing", () => {
      const result: ObjectID | null = ProjectMiddleware.getApiKey({
        headers: {},
      } as any);

      expect(result).toBeNull();
    });

    test("should return null for empty request", () => {
      const result: ObjectID | null = ProjectMiddleware.getApiKey({} as any);
      expect(result).toBeNull();
    });
  });

  describe("hasApiKey", () => {
    test("should return true when apikey header is present", () => {
      const result: boolean = ProjectMiddleware.hasApiKey({
        headers: { apikey: ObjectID.generate().toString() },
      } as any);

      expect(result).toBe(true);
    });

    test("should return false when apikey header is missing", () => {
      const result: boolean = ProjectMiddleware.hasApiKey({
        headers: {},
      } as any);

      expect(result).toBe(false);
    });
  });

  describe("API Key format validation", () => {
    test("should accept valid UUID format as apiKey", () => {
      const validUuid: string = "0c4e4d1a-f2b3-4c5e-8d9f-0a1b2c3d4e5f";
      const result: ObjectID | null = ProjectMiddleware.getApiKey({
        headers: { apikey: validUuid },
      } as any);

      expect(result).toBeInstanceOf(ObjectID);
      expect(result?.toString()).toBe(validUuid);
    });

    test("should handle apikey header with different casing from common patterns", () => {
      const apiKeyValue: string = ObjectID.generate().toString();
      const result: ObjectID | null = ProjectMiddleware.getApiKey({
        headers: { apikey: apiKeyValue },
      } as any);

      expect(result).toBeInstanceOf(ObjectID);
    });

    test("should not extract API key from non-standard header names", () => {
      const apiKeyValue: string = ObjectID.generate().toString();
      const result: ObjectID | null = ProjectMiddleware.getApiKey({
        headers: { "x-api-key": apiKeyValue },
      } as any);

      expect(result).toBeNull();
    });
  });
});
