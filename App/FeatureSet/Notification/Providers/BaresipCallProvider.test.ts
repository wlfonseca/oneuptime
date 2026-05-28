import BaresipCallProvider from "./BaresipCallProvider";
import BaresipConfig from "Common/Types/CallAndSMS/BaresipConfig";

const mockBridgeUrl: string = "http://sip-bridge:8000";

function createConfig(overrides: Partial<BaresipConfig> = {}): BaresipConfig {
  return {
    sipServer: "sip.provider.com",
    sipPort: 5060,
    sipUser: "testuser",
    sipPassword: "testpass",
    sipTransport: "udp",
    bridgeUrl: mockBridgeUrl,
    defaultCallerId: "+5511999999999",
    ttsEngine: "flite",
    ttsVoice: "slt",
    ...overrides,
  };
}

function mockBaresipResponse(body: string, status: number = 200): Response {
  return new Response(body, {
    status,
    statusText: status === 200 ? "OK" : "Error",
  });
}

const originalFetch: typeof fetch = globalThis.fetch;

describe("BaresipCallProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should searchAvailableNumbers throw not available", async () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    await expect(
      provider.searchAvailableNumbers({ countryCode: "BR" }),
    ).rejects.toThrow("not available");
  });

  it("should listOwnedNumbers return SIP account info", async () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    const numbers = await provider.listOwnedNumbers();
    expect(numbers).toHaveLength(1);
    expect(numbers[0]!.phoneNumber).toContain("testuser");
    expect(numbers[0]!.phoneNumber).toContain("sip.provider.com");
  });

  it("should generateGreetingResponse return say command", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    expect(provider.generateGreetingResponse("hello")).toBe("say:hello");
  });

  it("should generateDialResponse return SIP dial command", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    const response: string = provider.generateDialResponse({
      toPhoneNumber: "11999999999",
      fromPhoneNumber: "+5511999999999",
      timeoutSeconds: 30,
      statusCallbackUrl: "http://callback",
    });
    expect(response).toContain("dial:sip:11999999999");
    expect(response).toContain("sip.provider.com");
  });

  it("should generateHangupResponse return hangup", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    expect(provider.generateHangupResponse()).toBe("hangup");
    expect(provider.generateHangupResponse("bye")).toBe("say:bye,hangup");
  });

  it("should generateEscalationResponse combine say and dial", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    const response: string = provider.generateEscalationResponse("escalating", {
      toPhoneNumber: "11888888888",
      fromPhoneNumber: "+5511999999999",
      timeoutSeconds: 30,
      statusCallbackUrl: "http://callback",
    });
    expect(response).toBe(
      "say:escalating,dial:sip:11888888888@sip.provider.com",
    );
  });

  it("should parseIncomingCallWebhook extract caller and called numbers", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    const data = provider.parseIncomingCallWebhook({
      body: { caller: "11999999999", to: "11000000000", call_id: "abc123" },
      headers: {},
      url: "http://localhost/webhook",
      originalUrl: "http://localhost/webhook",
      protocol: "http",
      get: (_name: string) => undefined,
    });
    expect(data.callerPhoneNumber).toBe("11999999999");
    expect(data.calledPhoneNumber).toBe("11000000000");
    expect(data.callId).toBe("abc123");
  });

  it("should parseIncomingCallWebhook throw on missing caller", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    expect(() =>
      provider.parseIncomingCallWebhook({
        body: {},
        headers: {},
        url: "http://localhost/webhook",
        originalUrl: "http://localhost/webhook",
        protocol: "http",
        get: (_name: string) => undefined,
      }),
    ).toThrow("Caller ID not found");
  });

  it("should parseDialStatusWebhook map established to completed", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    const data = provider.parseDialStatusWebhook({
      body: { status: "established", call_id: "abc", duration: "15" },
      headers: {},
      url: "http://localhost/status",
      originalUrl: "http://localhost/status",
      protocol: "http",
      get: (_name: string) => undefined,
    });
    expect(data.dialStatus).toBe("completed");
    expect(data.dialDurationSeconds).toBe(15);
  });

  it("should parseDialStatusWebhook map busy", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    const data = provider.parseDialStatusWebhook({
      body: { status: "busy", call_id: "abc", duration: "0" },
      headers: {},
      url: "http://localhost/status",
      originalUrl: "http://localhost/status",
      protocol: "http",
      get: (_name: string) => undefined,
    });
    expect(data.dialStatus).toBe("busy");
  });

  it("should parseDialStatusWebhook map failed for unknown status", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    const data = provider.parseDialStatusWebhook({
      body: { status: "unknown_status", call_id: "abc" },
      headers: {},
      url: "http://localhost/status",
      originalUrl: "http://localhost/status",
      protocol: "http",
      get: (_name: string) => undefined,
    });
    expect(data.dialStatus).toBe("failed");
  });

  it("should validateWebhookSignature always return true", () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    expect(
      provider.validateWebhookSignature(
        {
          body: {},
          headers: {},
          url: "http://localhost",
          originalUrl: "http://localhost",
          protocol: "http",
          get: (_name: string) => undefined,
        },
        "some-signature",
      ),
    ).toBe(true);
  });

  it("should purchaseNumber throw not available", async () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    await expect(
      provider.purchaseNumber("+123", "http://webhook"),
    ).rejects.toThrow("not available");
  });

  it("should releaseNumber be no-op", async () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    await expect(provider.releaseNumber("any_id")).resolves.toBeUndefined();
  });

  it("should updateWebhookUrl be no-op", async () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    await expect(
      provider.updateWebhookUrl("any_id", "http://hook"),
    ).resolves.toBeUndefined();
  });

  it("should assignExistingNumber return passed values", async () => {
    const provider: BaresipCallProvider = new BaresipCallProvider(
      createConfig(),
    );
    const result = await provider.assignExistingNumber("my-id", "http://hook");
    expect(result.phoneNumberId).toBe("my-id");
    expect(result.phoneNumber).toBe("my-id");
  });

  describe("makeCall", () => {
    it("should register, dial, wait for established, and hangup on call end", async () => {
      const provider: BaresipCallProvider = new BaresipCallProvider(
        createConfig(),
      );

      let callstatCount: number = 0;
      (globalThis.fetch as jest.Mock).mockImplementation(
        (url: string): Response => {
          const urlStr: string = url.toString();

          if (urlStr.includes("reginfo")) {
            return mockBaresipResponse("no calls");
          }
          if (urlStr.includes("uanew")) {
            return mockBaresipResponse("OK");
          }
          if (urlStr.includes("dial")) {
            return mockBaresipResponse("OK");
          }
          if (urlStr.includes("callstat")) {
            callstatCount++;
            if (callstatCount <= 2) {
              return mockBaresipResponse("1 active call\nestablished");
            }
            return mockBaresipResponse("no active calls");
          }
          if (urlStr.includes("ausrc")) {
            return mockBaresipResponse("OK");
          }
          if (urlStr.includes("hangup")) {
            return mockBaresipResponse("OK");
          }
          return mockBaresipResponse("OK");
        },
      );

      await provider.makeCall(
        "11999999999",
        "+5511999999999",
        "Test message",
        30,
        "http://callback",
      );

      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("should complete without throwing when call does not establish", async () => {
      const provider: BaresipCallProvider = new BaresipCallProvider(
        createConfig(),
      );

      (globalThis.fetch as jest.Mock).mockImplementation(
        (url: string): Response => {
          const urlStr: string = url.toString();
          if (urlStr.includes("callstat")) {
            return mockBaresipResponse("no active calls");
          }
          return mockBaresipResponse("OK");
        },
      );

      await expect(
        provider.makeCall(
          "11999999999",
          "+5511999999999",
          "Test message",
          30,
          "http://callback",
        ),
      ).resolves.toBeUndefined();
    }, 10000);

    it("should throw on HTTP error from bridge", async () => {
      const provider: BaresipCallProvider = new BaresipCallProvider(
        createConfig(),
      );

      (globalThis.fetch as jest.Mock).mockImplementation(
        (url: string): Response => {
          const urlStr: string = url.toString();
          if (urlStr.includes("reginfo")) {
            return mockBaresipResponse("registered OK");
          }
          return mockBaresipResponse("error", 500);
        },
      );

      await expect(
        provider.makeCall(
          "11999999999",
          "+5511999999999",
          "Test message",
          30,
          "http://callback",
        ),
      ).rejects.toThrow("Baresip HTTP 500");
    });
  });
});
