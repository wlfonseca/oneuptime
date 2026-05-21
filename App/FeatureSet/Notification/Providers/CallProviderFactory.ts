import { ICallProvider } from "Common/Types/Call/CallProvider";
import CallProviderType from "Common/Types/Call/CallProviderType";
import TwilioCallProvider from "./TwilioCallProvider";
import FreeSwitchCallProvider from "./FreeSwitchCallProvider";
import { getTwilioConfig, getFreeSwitchConfig, CallProvider } from "../Config";
import TwilioConfig from "Common/Types/CallAndSMS/TwilioConfig";
import FreeSwitchConfig from "Common/Types/CallAndSMS/FreeSwitchConfig";
import BadDataException from "Common/Types/Exception/BadDataException";

export default class CallProviderFactory {
  private static instance: ICallProvider | null = null;
  private static currentProviderType: CallProviderType | null = null;

  public static async getProvider(): Promise<ICallProvider> {
    const providerType: CallProviderType = this.getProviderType();

    if (this.instance && this.currentProviderType === providerType) {
      return this.instance;
    }

    switch (providerType) {
      case CallProviderType.Twilio: {
        const twilioConfig: TwilioConfig | null = await getTwilioConfig();

        if (!twilioConfig) {
          throw new BadDataException(
            "Twilio configuration not found. Please configure Twilio in Admin Dashboard.",
          );
        }

        this.instance = new TwilioCallProvider(twilioConfig);
        this.currentProviderType = providerType;
        break;
      }
      case CallProviderType.FreeSwitch: {
        const fsConfig: FreeSwitchConfig | null = await getFreeSwitchConfig();

        if (!fsConfig) {
          throw new BadDataException(
            "FreeSwitch configuration not found. Please configure SIP/FreeSwitch in Admin Dashboard.",
          );
        }

        this.instance = new FreeSwitchCallProvider(fsConfig);
        this.currentProviderType = providerType;
        break;
      }
      default:
        throw new BadDataException(`Unknown call provider: ${providerType}`);
    }

    return this.instance;
  }

  public static getProviderWithConfig(
    customConfig: TwilioConfig | FreeSwitchConfig,
  ): ICallProvider {
    const providerType: CallProviderType = this.getProviderType();

    switch (providerType) {
      case CallProviderType.Twilio: {
        return new TwilioCallProvider(customConfig as TwilioConfig);
      }
      case CallProviderType.FreeSwitch: {
        return new FreeSwitchCallProvider(customConfig as FreeSwitchConfig);
      }
      default:
        throw new BadDataException(`Unknown call provider: ${providerType}`);
    }
  }

  public static async getProviderWithOptionalConfig(
    customConfig?: TwilioConfig | FreeSwitchConfig,
  ): Promise<ICallProvider> {
    if (customConfig) {
      return this.getProviderWithConfig(customConfig);
    }
    return this.getProvider();
  }

  public static getProviderType(): CallProviderType {
    switch (CallProvider.toLowerCase()) {
      case "twilio":
        return CallProviderType.Twilio;
      case "freeswitch":
        return CallProviderType.FreeSwitch;
      default:
        return CallProviderType.Twilio;
    }
  }

  public static resetProvider(): void {
    this.instance = null;
    this.currentProviderType = null;
  }
}
