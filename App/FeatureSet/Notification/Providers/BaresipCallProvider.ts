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
import BaresipConfig from "Common/Types/CallAndSMS/BaresipConfig";
import BadDataException from "Common/Types/Exception/BadDataException";
import logger from "Common/Server/Utils/Logger";

export default class BaresipCallProvider implements ICallProvider {
  private config: BaresipConfig;
  private registered: boolean = false;

  public constructor(config: BaresipConfig) {
    this.config = config;
  }

  public async searchAvailableNumbers(
    _options: SearchNumberOptions,
  ): Promise<AvailablePhoneNumber[]> {
    throw new BadDataException(
      "Phone number search is not available for baresip. Use your SIP trunk provider for number provisioning.",
    );
  }

  public async listOwnedNumbers(): Promise<OwnedPhoneNumber[]> {
    return [
      {
        phoneNumberId: this.config.sipUser,
        phoneNumber: `${this.config.sipUser}@${this.config.sipServer}`,
        friendlyName: "SIP Account",
      },
    ];
  }

  public async purchaseNumber(
    _phoneNumber: string,
    _webhookUrl: string,
  ): Promise<PurchasedPhoneNumber> {
    throw new BadDataException(
      "Number purchasing is not available for baresip. Use your SIP trunk provider.",
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
    // no-op for SIP trunk
  }

  public async updateWebhookUrl(
    _phoneNumberId: string,
    _webhookUrl: string,
  ): Promise<void> {
    // no-op for SIP trunk
  }

  public generateGreetingResponse(message: string): string {
    return `say:${message}`;
  }

  public generateDialResponse(options: DialOptions): string {
    return `dial:sip:${options.toPhoneNumber}@${this.config.sipServer}`;
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
    return `say:${message},dial:sip:${nextDialOptions.toPhoneNumber}@${this.config.sipServer}`;
  }

  public parseIncomingCallWebhook(request: WebhookRequest): IncomingCallData {
    const body: Record<string, unknown> = request.body as Record<
      string,
      unknown
    >;
    const callerId: string = (body["caller"] as string) || "";
    const calledNumber: string =
      (body["dialed_user"] as string) || (body["to"] as string) || "";

    if (!callerId) {
      throw new BadDataException("Caller ID not found in webhook request");
    }

    return {
      callId: (body["call_id"] as string) || "",
      callerPhoneNumber: callerId,
      calledPhoneNumber: calledNumber,
    };
  }

  public parseDialStatusWebhook(request: WebhookRequest): DialStatusData {
    const body: Record<string, unknown> = request.body as Record<
      string,
      unknown
    >;
    const status: string = (body["status"] as string) || "";

    return {
      callId: (body["call_id"] as string) || "",
      dialStatus: this.mapCallStatus(status),
      dialDurationSeconds: parseInt((body["duration"] as string) || "0"),
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
    _timeoutSeconds: number,
    _statusCallbackUrl: string,
  ): Promise<void> {
    const callerId: string = from || this.config.defaultCallerId || "";
    const dialTarget: string = to.includes("@")
      ? to
      : `${to}@${this.config.sipServer}`;

    await this.ensureRegistered();
    await this.sendCmd(`dial sip:${dialTarget}`);

    const trunk: string = `${this.config.sipUser}@${this.config.sipServer}`;
    logger.info(
      `Baresip call: ${callerId} → ${dialTarget} via trunk ${trunk}`,
      { service: "notification" },
    );

    const established: boolean = await this.waitForEstablished(30000);
    if (!established) {
      logger.warn(`Baresip call not established to ${dialTarget}`, {
        service: "notification",
      });
      await this.sendCmd("hangup");
      return;
    }

    if (message) {
      await this.playAudio(message);
    }

    const terminated: boolean = await this.waitForCallEnd(60000);
    if (!terminated) {
      logger.warn(
        `Baresip call to ${dialTarget} timed out waiting for hangup`,
        {
          service: "notification",
        },
      );
      await this.sendCmd("hangup");
    }
  }

  private async ensureRegistered(): Promise<void> {
    if (this.registered) {
      return;
    }

    try {
      const regInfo: string = await this.sendCmd("reginfo");
      if (regInfo.includes("registered") || regInfo.includes("OK")) {
        this.registered = true;
        return;
      }
    } catch {
      // not registered yet, proceed to register
    }

    const userAtHost: string = `${this.config.sipUser}@${this.config.sipServer}`;
    const transport: string = this.config.sipTransport || "udp";
    const account: string = `<sip:${userAtHost}:${this.config.sipPort};transport=${transport}>;auth_pass=${this.config.sipPassword}`;

    await this.sendCmd(`uanew ${encodeURIComponent(account)}`);
    this.registered = true;

    logger.info(`Baresip registered SIP account: ${userAtHost}`, {
      service: "notification",
    });
  }

  private async waitForEstablished(timeoutMs: number): Promise<boolean> {
    const start: number = Date.now();
    while (Date.now() - start < timeoutMs) {
      await this.delay(500);
      try {
        const stat: string = await this.sendCmd("callstat");
        if (
          stat.includes("established") ||
          stat.includes("active") ||
          stat.includes("ringing")
        ) {
          return true;
        }
        if (
          stat.includes("no active calls") ||
          stat.includes("closed") ||
          stat.includes("terminated") ||
          stat.includes("failed")
        ) {
          return false;
        }
      } catch {
        // retry
      }
    }
    return false;
  }

  private async waitForCallEnd(timeoutMs: number): Promise<boolean> {
    const start: number = Date.now();
    while (Date.now() - start < timeoutMs) {
      await this.delay(500);
      try {
        const stat: string = await this.sendCmd("callstat");
        if (
          stat.includes("no active calls") ||
          stat.includes("closed") ||
          stat.includes("terminated")
        ) {
          return true;
        }
      } catch {
        // retry
      }
    }
    return false;
  }

  private async playAudio(message: string): Promise<void> {
    if (message) {
      await this.sendCmd(`ausrc aufile,${encodeURIComponent(message)}`);
    }
  }

  private async sendCmd(cmd: string): Promise<string> {
    const url: string = `${this.config.bridgeUrl}/?/${encodeURIComponent(cmd)}`;

    if (!cmd || cmd.length === 0) {
      throw new BadDataException("Baresip command is empty");
    }

    try {
      const response: Response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new BadDataException(
          `Baresip HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return await response.text();
    } catch (err: unknown) {
      if (err instanceof BadDataException) {
        throw err;
      }
      const error: Error = err as Error;
      logger.error("Baresip command failed", {
        url,
        command: cmd,
        error: error.message,
        service: "notification",
      });
      throw new BadDataException(`Baresip command failed: ${error.message}`);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private mapCallStatus(status: string): DialStatusData["dialStatus"] {
    const map: Record<string, DialStatusData["dialStatus"]> = {
      established: "completed",
      completed: "completed",
      busy: "busy",
      "no-answer": "no-answer",
      no_answer: "no-answer",
      rejected: "busy",
      canceled: "canceled",
      cancelled: "canceled",
      failed: "failed",
      error: "failed",
    };
    const lower: string = status.toLowerCase();
    return map[lower] || "failed";
  }
}
