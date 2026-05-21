import {
  AvailablePhoneNumber,
  DialOptions,
  DialStatusData,
  ICallProvider,
  IncomingCallData,
  OwnedPhoneNumber,
  PurchasedPhoneNumber,
  SearchNumberOptions,
  WebhookRequest,
} from "Common/Types/Call/CallProvider";
import FreeSwitchConfig from "Common/Types/CallAndSMS/FreeSwitchConfig";
import BadDataException from "Common/Types/Exception/BadDataException";
import logger from "Common/Server/Utils/Logger";
import { exec } from "child_process";
import { promisify } from "util";

export default class FreeSwitchCallProvider implements ICallProvider {
  private config: FreeSwitchConfig;

  public constructor(config: FreeSwitchConfig) {
    this.config = config;
  }

  public async searchAvailableNumbers(
    _options: SearchNumberOptions,
  ): Promise<AvailablePhoneNumber[]> {
    throw new BadDataException(
      "Phone number search is not available for FreeSwitch. Use a SIP trunk provider for number provisioning.",
    );
  }

  public async listOwnedNumbers(): Promise<OwnedPhoneNumber[]> {
    return [
      {
        phoneNumberId: "sip-trunk",
        phoneNumber: this.config.gatewayAddress || "sip:trunk",
        friendlyName: "SIP Trunk",
      },
    ];
  }

  public async purchaseNumber(
    _phoneNumber: string,
    _webhookUrl: string,
  ): Promise<PurchasedPhoneNumber> {
    throw new BadDataException(
      "Number purchasing is not available for FreeSwitch. Use a SIP trunk provider.",
    );
  }

  public async assignExistingNumber(
    _phoneNumberId: string,
    _webhookUrl: string,
  ): Promise<PurchasedPhoneNumber> {
    return {
      phoneNumberId: _phoneNumberId,
      phoneNumber: _phoneNumberId,
    };
  }

  public async releaseNumber(_phoneNumberId: string): Promise<void> {
    // no-op for SIP
  }

  public async updateWebhookUrl(
    _phoneNumberId: string,
    _webhookUrl: string,
  ): Promise<void> {
    // no-op for SIP
  }

  public generateGreetingResponse(message: string): string {
    return `say:${message}`;
  }

  public generateDialResponse(options: DialOptions): string {
    return `dial:${options.toPhoneNumber},timeout:${options.timeoutSeconds}`;
  }

  public generateHangupResponse(message?: string): string {
    if (message) {
      return `say:${message},hangup`;
    }
    return "hangup";
  }

  public generateEscalationResponse(
    message: string,
    nextDialOptions: DialOptions,
  ): string {
    return `say:${message},dial:${nextDialOptions.toPhoneNumber},timeout:${nextDialOptions.timeoutSeconds}`;
  }

  public parseIncomingCallWebhook(request: WebhookRequest): IncomingCallData {
    const body: Record<string, unknown> = request.body as Record<
      string,
      unknown
    >;
    const callerId: string = (body["Caller-Caller-ID-Number"] as string) || "";
    const calledNumber: string =
      (body["variable_dialed_user"] as string) ||
      (body["Caller-Destination-Number"] as string) ||
      "";

    if (!callerId) {
      throw new BadDataException("Caller ID not found in webhook request");
    }

    return {
      callId: (body["Caller-Unique-ID"] as string) || "",
      callerPhoneNumber: callerId,
      calledPhoneNumber: calledNumber,
    };
  }

  public parseDialStatusWebhook(request: WebhookRequest): DialStatusData {
    const body: Record<string, unknown> = request.body as Record<
      string,
      unknown
    >;
    const hangupCause: string =
      (body["variable_hangup_cause"] as string) || "NONE_CALL_LEG_FAILED";
    const billSec: string = (body["variable_billsec"] as string) || "0";

    return {
      callId: (body["Caller-Unique-ID"] as string) || "",
      dialStatus: this.mapHangupCause(hangupCause),
      dialDurationSeconds: parseInt(billSec) || 0,
    };
  }

  public validateWebhookSignature(
    _request: WebhookRequest,
    _signature: string,
  ): boolean {
    return true;
  }

  public async makeCall(
    to: string,
    from: string,
    message: string,
    timeoutSeconds: number,
    statusCallbackUrl: string,
  ): Promise<void> {
    const cmd: string = this.buildOriginateCommand(
      to,
      from,
      message,
      timeoutSeconds,
    );

    logger.debug(`FreeSwitch originate: ${cmd}`, { service: "notification" });

    await this.sendCommand(cmd);

    if (statusCallbackUrl) {
      await this.configureCallBack(
        undefined,
        statusCallbackUrl,
        timeoutSeconds,
      );
    }
  }

  private buildOriginateCommand(
    to: string,
    from: string,
    message: string,
    _timeoutSeconds: number,
  ): string {
    const gateway: string = this.config.gatewayName
      ? `sofia/gateway/${this.config.gatewayName}/${to}`
      : `user/${to}`;

    const callerId: string = from || this.config.defaultCallerId || "anonymous";

    const ttsEngine: string = this.config.ttsEngine || "flite";
    const ttsVoice: string = this.config.ttsVoice || "slt";

    const audioSource: string = message.startsWith("http")
      ? `playback(${message})`
      : `say:${ttsEngine}:${ttsVoice}:${encodeURIComponent(message)}`;

    return `originate {origination_caller_id_number=${callerId},origination_caller_id_name=OneUptime,ignore_early_media=true,absolute_codec_string=PCMA,PCMU}${gateway} ${audioSource}`;
  }

  private async sendCommand(command: string): Promise<string> {
    return this.sendFsCli(command);
  }

  private async sendFsCli(command: string): Promise<string> {
    const execAsync = promisify(exec);

    const escaped: string = command.replace(/"/g, '\\"');
    const fsCli: string = this.config.fsCliPath || "fs_cli";
    const password: string = this.config.eventSocketPassword || "ClueCon";
    const host: string = this.config.eventSocketHost || "127.0.0.1";
    const port: string | number =
      this.config.eventSocketPort?.toString() || "8021";

    const cmd: string = `${fsCli} -h ${host} -p ${port} --password=${password} -x "${escaped}"`;

    try {
      const { stdout } = await execAsync(cmd, { timeout: 30000 });
      return stdout;
    } catch (err: unknown) {
      const error: Error = err as Error;
      logger.error("FreeSwitch fs_cli error", {
        cmd,
        error: error.message,
        service: "notification",
      });
      throw new BadDataException(`FreeSwitch command failed: ${error.message}`);
    }
  }

  private async configureCallBack(
    _channelUuid: string | undefined,
    _callbackUrl: string,
    _timeoutSeconds: number,
  ): Promise<void> {
    // In production, use mod_curl or ESL to set up async callbacks
  }

  private mapHangupCause(cause: string): DialStatusData["dialStatus"] {
    const map: Record<string, DialStatusData["dialStatus"]> = {
      NORMAL_CLEARING: "completed",
      USER_BUSY: "busy",
      NO_ANSWER: "no-answer",
      NO_USER_RESPONSE: "no-answer",
      CALL_REJECTED: "busy",
      ORIGINATOR_CANCEL: "canceled",
      INCOMPATIBLE_DESTINATION: "failed",
      NONE_CALL_LEG_FAILED: "failed",
    };
    return map[cause] || "failed";
  }
}
