import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { PREDICTION_CONTRACT_ABI, PREDICTION_CONTRACT_ADDRESS, CHAIN_CONFIG } from "./constants/contracts";

// Hook for submitting a prediction hash on-chain
export function useSubmitPrediction() {
  const { isConnected, address } = useAccount();
  
  // Use wagmi's useWriteContract hook for contract writing
  const { 
    isPending, 
    writeContractAsync,
  } = useWriteContract();
  
  // Submit prediction hash to the contract
  const submitPrediction = async (predictionHash: string): Promise<string | null> => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }
    
    try {
      console.log("Starting submission, connected address:", address);
      
      // Convert the hash if needed
      const hashAsBytes32 = predictionHash.startsWith("0x") ? (predictionHash as `0x${string}`) : (`0x${predictionHash}` as `0x${string}`);
      
      console.log("Prepared hash:", hashAsBytes32);
      console.log("Using contract:", PREDICTION_CONTRACT_ADDRESS);
      console.log("Chain ID:", CHAIN_CONFIG.baseSepolia.id);
      
      // Use the hook's writeContractAsync function instead of the action
      const hash = await writeContractAsync({
        address: PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_CONTRACT_ABI,
        functionName: "submit",
        args: [hashAsBytes32],
        chainId: CHAIN_CONFIG.baseSepolia.id,
      });
      
      console.log("Transaction submitted with hash:", hash);
      
      if (!hash) {
        console.error("No transaction hash returned");
        throw new Error("Transaction failed - no hash returned");
      }
      
      return hash;
    } catch (error: any) {
      console.error("Error submitting prediction on blockchain:", error);
      
      // More specific error messages
      if (error.message?.includes('user rejected')) {
        throw new Error("Transaction rejected in wallet");
      } else if (error.message?.includes('network')) {
        throw new Error("Network error - please make sure you're connected to Base Sepolia");
      } else {
        throw error;
      }
    }
  };
  
  return {
    submitPrediction,
    isLoading: isPending,
    isSuccess: false, // We'll manage this manually
  };
}

// Hook for revealing a prediction
export function useRevealPrediction() {
  const { isConnected, address } = useAccount();
  
  // Use wagmi's useWriteContract hook for contract writing
  const { 
    isPending,
    writeContractAsync
  } = useWriteContract();
  
  // Reveal a prediction with its content and salt
  const revealPrediction = async (index: number, content: string, salt: string): Promise<string | null> => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }
    
    try {
      console.log("Starting reveal for index:", index);
      console.log("Content:", content);
      console.log("Salt:", salt);
      
      // Use the hook's writeContractAsync function instead of the action
      const hash = await writeContractAsync({
        address: PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_CONTRACT_ABI,
        functionName: "reveal",
        args: [BigInt(index), content, salt],
        chainId: CHAIN_CONFIG.baseSepolia.id,
      });
      
      console.log("Reveal transaction submitted with hash:", hash);
      
      if (!hash) {
        console.error("No transaction hash returned for reveal");
        throw new Error("Reveal transaction failed - no hash returned");
      }
      
      return hash;
    } catch (error: any) {
      console.error("Error revealing prediction on blockchain:", error);
      
      // More specific error messages
      if (error.message?.includes('user rejected')) {
        throw new Error("Reveal transaction rejected in wallet");
      } else if (error.message?.includes('network')) {
        throw new Error("Network error - please make sure you're connected to Base Sepolia");
      } else if (error.message?.includes('match')) {
        throw new Error("Content does not match the stored hash");
      } else {
        throw error;
      }
    }
  };
  
  return {
    revealPrediction,
    isLoading: isPending,
    isSuccess: false,
  };
}

// Hook to get all predictions for the current user
export function useGetAllPredictions() {
  const { address } = useAccount();
  
  const { 
    data, 
    isLoading, 
    isError,
    error,
    refetch
  } = useReadContract({
    address: PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
    abi: PREDICTION_CONTRACT_ABI,
    functionName: "getAllPredictions",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
  
  return {
    predictions: data,
    isLoading,
    isError,
    error,
    refetch
  };
}

// Hook to verify a specific prediction
export function useVerifyPrediction(predictionHash: string) {
  const { address } = useAccount();
  
  const hashAsBytes32 = predictionHash.startsWith("0x") ? (predictionHash as `0x${string}`) : (`0x${predictionHash}` as `0x${string}`);
  
  const { 
    data, 
    isLoading, 
    isError,
    error
  } = useReadContract({
    address: PREDICTION_CONTRACT_ADDRESS as `0x${string}`,
    abi: PREDICTION_CONTRACT_ABI,
    functionName: "verifyPrediction",
    args: address && predictionHash ? [address, hashAsBytes32] : undefined,
    query: {
      enabled: !!address && !!predictionHash,
    },
  });
  
  return {
    verification: data,
    isLoading,
    isError,
    error
  };
}

// Mock function for prototype testing or when contract is not yet deployed
export async function mockSubmitPrediction(_predictionHash: string): Promise<string> {
  console.log("Using mock implementation for predictionHash:", _predictionHash);
  
  // Simulate blockchain confirmation delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate a fake transaction hash
  const fakeHash = `0x${Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;
  
  console.log("Generated fake transaction hash:", fakeHash);
  return fakeHash;
}

// Mock function for revealing predictions
export async function mockRevealPrediction(_index: number, _content: string, _salt: string): Promise<string> {
  console.log("Using mock implementation for reveal:");
  console.log("Index:", _index);
  console.log("Content:", _content);
  console.log("Salt:", _salt);
  
  // Simulate blockchain confirmation delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate a fake transaction hash
  const fakeHash = `0x${Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;
  
  console.log("Generated fake reveal transaction hash:", fakeHash);
  return fakeHash;
}