import GlobalConfig from "../../Models/DatabaseModels/GlobalConfig";
import { describe, expect, test } from "@jest/globals";
import BaseModel from "../../Models/DatabaseModels/DatabaseBaseModel/DatabaseBaseModel";

describe("GlobalConfig", () => {
  test("should be an instance of BaseModel", () => {
    const config: GlobalConfig = new GlobalConfig();
    expect(config).toBeInstanceOf(BaseModel);
  });

  test("should have callProviderType property with default undefined", () => {
    const config: GlobalConfig = new GlobalConfig();
    expect(config.callProviderType).toBeUndefined();
  });

  test("should accept callProviderType value 'freeswitch'", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.callProviderType = "freeswitch";
    expect(config.callProviderType).toBe("freeswitch");
  });

  test("should accept callProviderType value 'twilio'", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.callProviderType = "twilio";
    expect(config.callProviderType).toBe("twilio");
  });

  test("should have freeSwitchEventSocketHost property", () => {
    const config: GlobalConfig = new GlobalConfig();
    expect("freeSwitchEventSocketHost" in config).toBe(true);
    config.freeSwitchEventSocketHost = "freeswitch";
    expect(config.freeSwitchEventSocketHost).toBe("freeswitch");
  });

  test("should have freeSwitchEventSocketPort property", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.freeSwitchEventSocketPort = 8021;
    expect(config.freeSwitchEventSocketPort).toBe(8021);
  });

  test("should have freeSwitchGatewayName property", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.freeSwitchGatewayName = "zadarma";
    expect(config.freeSwitchGatewayName).toBe("zadarma");
  });

  test("should have freeSwitchSipServer property", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.freeSwitchSipServer = "pbx.zadarma.com";
    expect(config.freeSwitchSipServer).toBe("pbx.zadarma.com");
  });

  test("should have freeSwitchSipUser property", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.freeSwitchSipUser = "537939-103";
    expect(config.freeSwitchSipUser).toBe("537939-103");
  });

  test("should have freeSwitchSipPassword property", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.freeSwitchSipPassword = "5hyBXxP0Ss";
    expect(config.freeSwitchSipPassword).toBe("5hyBXxP0Ss");
  });

  test("should have piperHost property", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.piperHost = "localhost";
    expect(config.piperHost).toBe("localhost");
  });

  test("should have piperPort property", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.piperPort = 5100;
    expect(config.piperPort).toBe(5100);
  });

  test("should have freeSwitchEventSocketPassword property", () => {
    const config: GlobalConfig = new GlobalConfig();
    config.freeSwitchEventSocketPassword = "ClueCon";
    expect(config.freeSwitchEventSocketPassword).toBe("ClueCon");
  });
});
