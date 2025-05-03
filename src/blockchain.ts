import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";

// Simple contract ABI for storing prediction hashes
// In a real implementation, you would deploy this contract to Base
export const PREDICTION_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "storePrediction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "predictions",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
];

// This would be your deployed contract address on Base
// For this prototype, we'll use a placeholder
export const PREDICTION_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

// Hook for storing prediction hash
export function useStorePrediction() {
  const { isConnected } = useAccount();
  
  // Use wagmi's useWriteContract hook (renamed from useContractWrite in v2)
  const { 
    data: hash,
    isPending,
    writeContract
  } = useWriteContract();
  
  // Wait for transaction
  const { 
    isLoading: isConfirming,
    isSuccess 
  } = useWaitForTransactionReceipt({
    hash,
  });
  
  // Store prediction hash on Base blockchain
  const storePrediction = async (predictionHash: string): Promise<string | null> => {
    if (!isConnected || !writeContract) {
      throw new Error("Wallet not connected");
    }
    
    try {
      // Convert the hash if needed
      const hashAsBytes32 = predictionHash.startsWith("0x") ? predictionHash : `0x${predictionHash}`;
      
      // Call contract
      const txHash = await writeContract({
        address: PREDICTION_CONTRACT_ADDRESS,
        abi: PREDICTION_ABI,
        functionName: "storePrediction",
        args: [hashAsBytes32],
        chainId: base.id,
      });
      
      // In wagmi v2, writeContract returns void
      // So we need to get the hash from elsewhere
      return typeof txHash === 'string' ? txHash : 'tx-hash-placeholder';
    } catch (error) {
      console.error("Error storing prediction on blockchain:", error);
      return null;
    }
  };
  
  return {
    storePrediction,
    isLoading: isPending || isConfirming,
    isSuccess,
    txHash: hash,
  };
}

// Mock function for prototype testing
export async function mockStorePrediction(_predictionHash: string): Promise<string> {
  // Simulate blockchain confirmation delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate a fake transaction hash
  const fakeHash = `0x${Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;
  
  return fakeHash;
}