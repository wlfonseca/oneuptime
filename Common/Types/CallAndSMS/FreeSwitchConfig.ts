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
  sipProviderHost?: string;
  sipProviderPort?: number;
  sipProviderUsername?: string;
  sipProviderPassword?: string;
  piperHost?: string;
  piperPort?: number;
}

export default FreeSwitchConfig;
