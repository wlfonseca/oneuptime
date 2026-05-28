interface BaresipConfig {
  sipServer: string;
  sipPort: number;
  sipUser: string;
  sipPassword: string;
  sipTransport: "udp" | "tcp" | "tls";
  bridgeUrl: string;
  defaultCallerId?: string | undefined;
  ttsEngine?: string | undefined;
  ttsVoice?: string | undefined;
}

export default BaresipConfig;
