# Prediction Contract

A smart contract that allows users to store and reveal predictions on the Base Sepolia testnet.

## Features

- Submit hashed predictions on-chain
- Reveal predictions with original content and salt
- View prediction history for any address
- Verify the authenticity of revealed predictions

## Development Setup

This project uses [Foundry](https://book.getfoundry.sh/) for Ethereum development.

1. Install Foundry:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   ```

2. Update Foundry:
   ```bash
   foundryup
   ```

3. Install dependencies:
   ```bash
   forge install
   ```

4. Run tests:
   ```bash
   forge test
   ```

## Deployment to Base Sepolia

1. Create a `.env` file by copying `.env.example` and fill in your values:
   ```bash
   cp .env.example .env
   ```

2. Add your private key to the `.env` file:
   ```
   PRIVATE_KEY=your_private_key_here
   BASESCAN_API_KEY=your_basescan_api_key_here
   ```

3. Deploy the contract to Base Sepolia:
   ```bash
   forge script script/DeployPrediction.s.sol:DeployPrediction --rpc-url base_sepolia --broadcast --verify
   ```

   If you don't want to verify the contract, you can omit the `--verify` flag:
   ```bash
   forge script script/DeployPrediction.s.sol:DeployPrediction --rpc-url base_sepolia --broadcast
   ```

4. After deployment, update the `.env` file in the React app root directory with the deployed contract address:
   ```
   VITE_PREDICTION_CONTRACT_ADDRESS=your_deployed_contract_address
   ```

## Contract Functions

### submit(bytes32 hash)
Submit a prediction hash to the blockchain.

### reveal(uint256 index, string calldata content, string calldata salt)
Reveal a previously submitted prediction by providing the original content and salt.

### getPredictionCount(address user)
Get the number of predictions made by a user.

### getPrediction(address user, uint256 index)
Get details of a specific prediction.

### getAllPredictions(address user)
Get all predictions made by a user.

### verifyPrediction(address user, bytes32 hash)
Verify if a prediction hash exists and get its details.

## Basic Foundry Commands

### Build
```shell
$ forge build
```

### Test
```shell
$ forge test
```

### Format
```shell
$ forge fmt
```

### Gas Snapshots
```shell
$ forge snapshot
```

## Documentation

See the [Foundry Book](https://book.getfoundry.sh/) for more information.

## License

This project is licensed under the MIT License.
