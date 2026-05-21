interface FreeSwitchConfig {
  eventSocketHost: string;
  eventSocketPort: number;
  eventSocketPassword: string;
  gatewayName?: string;
  gatewayAddress?: string;
  defaultCallerId?: string;
  ttsEngine?: string;
  ttsVoice?: string;
  fsCliPath?: string;
}

export default FreeSwitchConfig;
