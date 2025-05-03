/// <reference types="vite/client" />

// Make sure TypeScript recognizes import.meta.env variables
interface ImportMetaEnv {
  readonly VITE_PREDICTION_CONTRACT_ADDRESS?: string;
  readonly MODE?: string;
  // Add other environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
