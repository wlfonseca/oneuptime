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
import net from "net";
import http from "http";
import fs from "fs";

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
    return {
      callId: (body["Caller-Unique-ID"] as string) || "",
      callerPhoneNumber: callerId,
      calledPhoneNumber: (body["Caller-Destination-Number"] as string) || "",
    };
  }

  public parseDialStatusWebhook(request: WebhookRequest): DialStatusData {
    const body: Record<string, unknown> = request.body as Record<
      string,
      unknown
    >;
    const status: string = (body["Call-Result"] as string) || "failed";
    return {
      callId: (body["Call-Unique-ID"] as string) || "",
      dialStatus: status as DialStatusData["dialStatus"],
    };
  }

  public validateWebhookSignature(
    _request: WebhookRequest,
    _signature: string,
  ): boolean {
    return true;
  }

  private async generateTtsAudio(message: string): Promise<string | null> {
    const piperHost: string = this.config.piperHost || "oneuptime-piper-tts";
    const piperPort: number = this.config.piperPort || 5002;
    const audioPath: string = `/tmp/oneuptime_audio/call_${Date.now()}.wav`;

    try {
      const audio: Buffer = await new Promise<Buffer>((resolve, reject) => {
        const postData: string = JSON.stringify({ text: message });
        const req: http.ClientRequest = http.request(
          {
            hostname: piperHost,
            port: piperPort,
            path: "/api/tts",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            },
            timeout: 15000,
          },
          (res: http.IncomingMessage) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
              if (res.statusCode === 200) {
                resolve(Buffer.concat(chunks));
              } else {
                reject(
                  new Error(`Piper HTTP ${res.statusCode}: ${chunks.join("")}`),
                );
              }
            });
          },
        );
        req.on("error", (err: Error) => reject(err));
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Piper request timeout"));
        });
        req.write(postData);
        req.end();
      });

      fs.writeFileSync(audioPath, audio);
      logger.debug(`Piper TTS audio saved to ${audioPath}`, {
        service: "notification",
      });
      return audioPath;
    } catch (err) {
      logger.error("Piper TTS failed", {
        error: (err as Error).message,
        service: "notification",
      });
      return null;
    }
  }

  private async sendFsCli(command: string): Promise<string> {
    const host: string = this.config.eventSocketHost || "127.0.0.1";
    const port: number = this.config.eventSocketPort || 8021;
    const password: string = this.config.eventSocketPassword || "ClueCon";

    return new Promise<string>((resolve, reject) => {
      const client: net.Socket = new net.Socket();
      let buffer: string = "";
      let authenticated: boolean = false;
      let commandResolved: boolean = false;

      const timeout: NodeJS.Timeout = setTimeout(() => {
        if (!commandResolved) {
          commandResolved = true;
          client.destroy();
          reject(
            new BadDataException(
              `FreeSwitch ESL command timed out: ${command}`,
            ),
          );
        }
      }, 30000);

      client.connect(port, host, () => {
        logger.debug(`Connected to FreeSwitch ESL at ${host}:${port}`, {
          service: "notification",
        });
      });

      client.on("data", (data: Buffer) => {
        buffer += data.toString();

        if (!authenticated && buffer.includes("Content-Type: auth/request")) {
          authenticated = true;
          buffer = "";
          client.write(`auth ${password}\n\n`);
          return;
        }

        if (
          authenticated &&
          !commandResolved &&
          buffer.includes("Content-Type: command/reply")
        ) {
          commandResolved = true;
          clearTimeout(timeout);

          const bodyStart: number = buffer.indexOf("\n\n");
          let body: string = "";
          if (bodyStart !== -1) {
            body = buffer.substring(bodyStart + 2).trim();
          }

          client.end();
          resolve(body);
        }
      });

      client.on("error", (err: Error) => {
        if (!commandResolved) {
          commandResolved = true;
          clearTimeout(timeout);
          logger.error("FreeSwitch ESL error", {
            error: err.message,
            command,
            service: "notification",
          });
          reject(
            new BadDataException(`FreeSwitch command failed: ${err.message}`),
          );
        }
      });

      client.on("connect", () => {
        client.write("connect\n\n");
      });

      client.on("close", () => {
        if (!commandResolved) {
          commandResolved = true;
          clearTimeout(timeout);
          reject(
            new BadDataException(
              `FreeSwitch ESL connection closed before command completed: ${command}`,
            ),
          );
        }
      });

      const checkAuthAndSend: () => void = () => {
        if (authenticated && !commandResolved) {
          client.write(`api ${command}\n\n`);
        } else if (!commandResolved) {
          setTimeout(checkAuthAndSend, 50);
        }
      };

      setTimeout(checkAuthAndSend, 100);
    });
  }

  private async sendCommand(command: string): Promise<string> {
    return this.sendFsCli(command);
  }

  private async ensureGatewayConfigured(): Promise<void> {
    const gatewayName: string | undefined = this.config.gatewayName;
    const sipHost: string | undefined = this.config.sipProviderHost;

    if (!gatewayName || !sipHost) {
      return;
    }

    const gwList: string = await this.sendCommand(
      `sofia profile external gw list`,
    );

    if (gwList.includes(gatewayName)) {
      return;
    }

    await this.sendCommand(
      `sofia profile external gw add ${gatewayName} sip:${this.config.sipProviderHost}`,
    );

    if (this.config.sipProviderUsername) {
      await this.sendCommand(
        `sofia profile external gw set ${gatewayName} auth-username ${this.config.sipProviderUsername}`,
      );
    }

    if (this.config.sipProviderPassword) {
      await this.sendCommand(
        `sofia profile external gw set ${gatewayName} auth-password ${this.config.sipProviderPassword}`,
      );
    }

    await this.sendCommand(
      `sofia profile external gw set ${gatewayName} register true`,
    );

    await this.sendCommand(`sofia profile external restart`);
  }

  public async makeCall(
    to: string,
    from: string,
    message: string,
    timeoutSeconds: number,
    statusCallbackUrl: string,
  ): Promise<void> {
    // Generate TTS audio via Piper
    const audioPath: string | null = await this.generateTtsAudio(message);

    await this.ensureGatewayConfigured();

    const gatewayName: string = this.config.gatewayName || "setevoip";
    const callerId: string =
      this.config.defaultCallerId?.toString() || from || "5511999999999";
    const timeout: number = timeoutSeconds || 30;

    let originateCmd: string;

    if (audioPath) {
      originateCmd = `bgapi originate {origination_caller_id_number=${callerId},originate_timeout=${timeout},ignore_early_media=true}sofia/gateway/${gatewayName}/${to} &playback(${audioPath})`;
    } else {
      originateCmd = `bgapi originate {origination_caller_id_number=${callerId},originate_timeout=${timeout},ignore_early_media=true}sofia/gateway/${gatewayName}/${to} &say(text="${message}")`;
    }

    logger.debug(`FreeSwitch originate: ${originateCmd}`, {
      service: "notification",
    });

    await this.sendCommand(originateCmd);

    if (statusCallbackUrl) {
      await this.configureCallBack(
        undefined,
        statusCallbackUrl,
        timeoutSeconds,
      );
    }
  }

  private async configureCallBack(
    _sessionId: string | undefined,
    _statusCallbackUrl: string,
    _timeoutSeconds: number,
  ): Promise<void> {
    // Callback configured via SIP headers if needed
  }
}
