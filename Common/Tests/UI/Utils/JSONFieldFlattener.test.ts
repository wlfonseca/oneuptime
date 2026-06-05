import { describe, expect, test } from "@jest/globals";
import {
  flattenJSONFields,
  JSONFieldNode,
} from "../../../UI/Utils/JSONFieldFlattener";

describe("flattenJSONFields", () => {
  test("should return empty array for null", () => {
    expect(flattenJSONFields(null)).toEqual([]);
  });

  test("should return empty array for string", () => {
    expect(flattenJSONFields("hello")).toEqual([]);
  });

  test("should return empty array for empty object", () => {
    expect(flattenJSONFields({})).toEqual([]);
  });

  test("should flatten flat object with primitives", () => {
    const result: Array<JSONFieldNode> = flattenJSONFields({
      name: "John",
      age: 30,
      active: true,
    });

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      path: "name",
      key: "name",
      type: "string",
    });
    expect(result).toContainEqual({ path: "age", key: "age", type: "number" });
    expect(result).toContainEqual({
      path: "active",
      key: "active",
      type: "boolean",
    });
  });

  test("should flatten nested object", () => {
    const result: Array<JSONFieldNode> = flattenJSONFields({
      user: {
        name: "John",
        address: {
          city: "NYC",
        },
      },
    });

    expect(result).toContainEqual({
      path: "user",
      key: "user",
      type: "object",
    });
    expect(result).toContainEqual({
      path: "user.name",
      key: "name",
      type: "string",
    });
    expect(result).toContainEqual({
      path: "user.address",
      key: "address",
      type: "object",
    });
    expect(result).toContainEqual({
      path: "user.address.city",
      key: "city",
      type: "string",
    });
  });

  test("should handle array of objects", () => {
    const result: Array<JSONFieldNode> = flattenJSONFields({
      items: [
        { title: "Item 1", price: 10 },
        { title: "Item 2", price: 20 },
      ],
    });

    expect(result).toContainEqual({
      path: "items",
      key: "items",
      type: "array",
    });
    expect(result).toContainEqual({
      path: "items[0].title",
      key: "title",
      type: "string",
    });
    expect(result).toContainEqual({
      path: "items[0].price",
      key: "price",
      type: "number",
    });
  });

  test("should handle null values", () => {
    const result: Array<JSONFieldNode> = flattenJSONFields({
      nullable: null,
    });

    expect(result).toContainEqual({
      path: "nullable",
      key: "nullable",
      type: "null",
    });
  });

  test("should handle webhook-like payload", () => {
    const result: Array<JSONFieldNode> = flattenJSONFields({
      event: "incident.created",
      incident: {
        id: "INC-001",
        title: "Server Down",
        severity: "critical",
        assignee: {
          email: "dev@example.com",
          name: "Dev Team",
        },
      },
      metadata: {
        source: "monitoring",
        tags: ["production", "p1"],
      },
    });

    expect(result).toContainEqual({
      path: "event",
      key: "event",
      type: "string",
    });
    expect(result).toContainEqual({
      path: "incident",
      key: "incident",
      type: "object",
    });
    expect(result).toContainEqual({
      path: "incident.id",
      key: "id",
      type: "string",
    });
    expect(result).toContainEqual({
      path: "incident.title",
      key: "title",
      type: "string",
    });
    expect(result).toContainEqual({
      path: "incident.severity",
      key: "severity",
      type: "string",
    });
    expect(result).toContainEqual({
      path: "incident.assignee",
      key: "assignee",
      type: "object",
    });
    expect(result).toContainEqual({
      path: "incident.assignee.email",
      key: "email",
      type: "string",
    });
    expect(result).toContainEqual({
      path: "metadata.source",
      key: "source",
      type: "string",
    });
    expect(result).toContainEqual({
      path: "metadata.tags",
      key: "tags",
      type: "array",
    });
  });

  test("should return empty array for empty array", () => {
    expect(flattenJSONFields([])).toEqual([]);
  });

  test("should return empty array for array of primitives", () => {
    expect(flattenJSONFields([1, 2, 3])).toEqual([]);
  });

  test("should handle number zero and boolean false", () => {
    const result: Array<JSONFieldNode> = flattenJSONFields({
      count: 0,
      enabled: false,
      empty: "",
    });

    expect(result).toContainEqual({
      path: "count",
      key: "count",
      type: "number",
    });
    expect(result).toContainEqual({
      path: "enabled",
      key: "enabled",
      type: "boolean",
    });
    expect(result).toContainEqual({
      path: "empty",
      key: "empty",
      type: "string",
    });
  });

  test("should handle deeply nested structure", () => {
    const result: Array<JSONFieldNode> = flattenJSONFields({
      a: { b: { c: { d: { e: "deep" } } } },
    });

    expect(result).toContainEqual({
      path: "a",
      key: "a",
      type: "object",
    });
    expect(result).toContainEqual({
      path: "a.b",
      key: "b",
      type: "object",
    });
    expect(result).toContainEqual({
      path: "a.b.c",
      key: "c",
      type: "object",
    });
    expect(result).toContainEqual({
      path: "a.b.c.d",
      key: "d",
      type: "object",
    });
    expect(result).toContainEqual({
      path: "a.b.c.d.e",
      key: "e",
      type: "string",
    });
  });
});
