import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { CHAIN_CONFIG } from "./constants/contracts";

// Determine if we're in development mode using import.meta
const isDevelopment = import.meta.env?.MODE === 'development';

// Create a Chain object from our config
const baseSepolia = {
  ...CHAIN_CONFIG.baseSepolia,
  id: CHAIN_CONFIG.baseSepolia.id as any,
};

export const config = createConfig({
  chains: [baseSepolia, base, mainnet],
  connectors: [
    ...[...(isDevelopment ? [coinbaseWallet({preference: 'smartWalletOnly'})] : [])],
    farcasterFrame(),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
