import { JSONObject, JSONValue } from "../../Types/JSON";

export interface JSONFieldNode {
  path: string;
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
}

export function flattenJSONFields(
  obj: JSONValue,
  prefix: string = "",
): Array<JSONFieldNode> {
  const fields: Array<JSONFieldNode> = [];

  if (typeof obj !== "object" || obj === null) {
    return fields;
  }

  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      return flattenJSONFields(obj[0], `${prefix}[0]`);
    }
    return fields;
  }

  for (const [key, value] of Object.entries(obj as JSONObject)) {
    const path: string = prefix ? `${prefix}.${key}` : key;
    const valueType: string = typeof value;

    if (value === null) {
      fields.push({ path, key, type: "null" });
    } else if (Array.isArray(value)) {
      fields.push({ path, key, type: "array" });
      if (
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null
      ) {
        fields.push(...flattenJSONFields(value[0], `${path}[0]`));
      }
    } else if (valueType === "object") {
      fields.push({ path, key, type: "object" });
      fields.push(...flattenJSONFields(value as JSONObject, path));
    } else {
      fields.push({
        path,
        key,
        type: valueType as "string" | "number" | "boolean",
      });
    }
  }

  return fields;
}
