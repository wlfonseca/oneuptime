import BadDataException from "../Exception/BadDataException";
import { JSONObject, ObjectType } from "../JSON";
import QueryOperator from "./QueryOperator";

export default class RegexMatch extends QueryOperator<string> {
  private _regexValue!: string;

  public get value(): string {
    return this._regexValue;
  }

  public set value(v: string) {
    this._regexValue = v;
  }

  public constructor(value: string) {
    super();
    this.value = value;
  }

  public override toString(): string {
    return this.value;
  }

  public override toJSON(): JSONObject {
    return {
      _type: ObjectType.RegexMatch,
      value: (this as RegexMatch).toString(),
    };
  }

  public static override fromJSON(json: JSONObject): RegexMatch {
    if (json["_type"] === ObjectType.RegexMatch) {
      return new RegexMatch((json["value"] as string) || "");
    }

    throw new BadDataException("Invalid JSON: " + JSON.stringify(json));
  }
}
