# Prediction App

A decentralized app that allows users to securely store predictions and reveal them later with cryptographic proof they were made at a specific time.

## Features

- Create predictions with cryptographic hashing for verification
- Store prediction hashes on the Base Sepolia blockchain
- Securely store prediction content in WebAuthn passkeys
- Reveal predictions at any time with proof of when they were created
- Share revealed predictions on Twitter or Warpcast with blockchain verification

## Tech Stack

- **Frontend**: React + TypeScript with Vite
- **Authentication**: WebAuthn passkeys with largeBlob extension
- **Blockchain**: Base Sepolia testnet with Solidity smart contract
- **Wallet Integration**: wagmi + Warpcast Frame support

## Getting Started

### Prerequisites

- Node.js 16+
- A modern browser with WebAuthn support
- (For deployment) A wallet with Base Sepolia ETH

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd prediction
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

## Smart Contract

The app uses a Solidity smart contract deployed on Base Sepolia for storing prediction hashes and verification. 

**Deployed Contract**: [0x2A42f29d463e182134bdA4F21d377f07AfcF32Ff](https://sepolia.basescan.org/address/0x2A42f29d463e182134bdA4F21d377f07AfcF32Ff)

See the [contracts/README.md](./contracts/README.md) for more information.

### Key Contract Functions

- `submit(bytes32 hash)`: Store a prediction hash on-chain
- `reveal(uint index, string content, string salt)`: Reveal a prediction with proof
- `getAllPredictions(address user)`: Get a user's prediction history

### Deploying to Base Sepolia

1. Ensure you have Foundry installed
2. Navigate to the contracts directory:
   ```bash
   cd contracts
   ```

3. Follow the deployment instructions in [contracts/README.md](./contracts/README.md)

4. After deployment, update your `.env` file with the contract address:
   ```
   VITE_PREDICTION_CONTRACT_ADDRESS=your_deployed_contract_address
   ```

## WebAuthn Integration

The app uses WebAuthn passkeys with the largeBlob extension to securely store prediction content locally on your device. This provides:

- Secure storage without sending prediction content to any server
- Authentication tied to your device
- Protection from data loss through browser clearing

## Farcaster Frame Support

This app works with Warpcast and supports Farcaster Frames for sharing predictions.

## License

MIT
