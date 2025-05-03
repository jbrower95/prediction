import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState, useRef } from "react";
import { useAccount, useConnect } from "wagmi";
import { 
  Prediction, 
  registerPasskey,
  loginWithPasskey,
  getAuthState,
  clearAuthState,
  isWebAuthnSupported, 
  isLargeBlobSupported,
  addPrediction,
  getAllPredictions,
  storeInLocalStorage,
  getFromLocalStorage
} from "./webauthn";
import { mockSubmitPrediction, useSubmitPrediction, useRevealPrediction } from "./blockchain";
import { PREDICTION_CONTRACT_ADDRESS, CHAIN_CONFIG } from "./constants/contracts";

function Toast({ message }: { message: string }) {
  return (
    <div className="toast-notification">
      {message}
    </div>
  );
}

function App() {
  const [theme] = useState<"dark" | "light">("dark");
  const [webAuthnSupported, setWebAuthnSupported] = useState<boolean | null>(null);
  const [largeBlobSupported, setLargeBlobSupported] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    sdk.actions.ready();
    document.body.className = theme;
    
    // Check WebAuthn support
    const checkWebAuthnSupport = async () => {
      const isSupported = isWebAuthnSupported();
      setWebAuthnSupported(isSupported);
      
      if (isSupported) {
        const isLargeBlobSupport = await isLargeBlobSupported();
        setLargeBlobSupported(isLargeBlobSupport);
      }
    };
    
    // Check for existing login in localStorage
    const checkAuthState = () => {
      const authState = getAuthState();
      const isLoggedIn = !!authState;
      
      // Update authentication state
      setIsAuthenticated(isLoggedIn);
      
      if (isLoggedIn) {
        console.log(`User logged in with ID: ${authState?.userId || 'unknown'}`);
      }
    };
    
    checkWebAuthnSupport();
    checkAuthState();
  }, [theme]);

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = () => {
    clearAuthState();
    setIsAuthenticated(false);
  };

  // Handle showing toast messages
  const showToast = (message: string) => {
    setToast(message);
    // Auto-hide toast after 3.5 seconds
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <svg className="logo" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="title-container">
            <h1>PREDICTION</h1>
            <span 
              className="network-badge" 
              onClick={() => {
                // First try to switch chains directly if wallet supports it
                try {
                  // Access wallet if connected
                  const ethereum = (window as any).ethereum;
                  if (ethereum) {
                    ethereum.request({
                      method: 'wallet_switchEthereumChain',
                      params: [{ chainId: `0x${CHAIN_CONFIG.baseSepolia.id.toString(16)}` }]
                    }).catch((switchError: any) => {
                      // This error code indicates that the chain has not been added to MetaMask
                      if (switchError.code === 4902) {
                        ethereum.request({
                          method: 'wallet_addEthereumChain',
                          params: [{
                            chainId: `0x${CHAIN_CONFIG.baseSepolia.id.toString(16)}`,
                            chainName: 'Base Sepolia',
                            nativeCurrency: {
                              name: 'Ethereum',
                              symbol: 'ETH',
                              decimals: 18
                            },
                            rpcUrls: ['https://sepolia.base.org'],
                            blockExplorerUrls: ['https://sepolia.basescan.org']
                          }]
                        });
                      }
                    });
                  } else {
                    // Fallback to chainlist.org
                    window.open(`https://chainlist.org/chain/${CHAIN_CONFIG.baseSepolia.id}`, '_blank');
                  }
                } catch (error) {
                  console.log("Error switching chain:", error);
                  // Fallback to chainlist.org
                  window.open(`https://chainlist.org/chain/${CHAIN_CONFIG.baseSepolia.id}`, '_blank');
                }
              }}
              title="Click to switch to Base Sepolia network"
            >
              Base Sepolia
            </span>
          </div>
        </div>
        <div className="header-controls">
          {isAuthenticated && (
            <button 
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
          <ConnectMenu />
        </div>
      </header>

      <main>
        {!isAuthenticated ? (
          <AuthView 
            webAuthnSupported={webAuthnSupported}
            largeBlobSupported={largeBlobSupported}
            onAuthSuccess={handleAuthSuccess}
          />
        ) : (
          <div className="predictions-page">
            <PredictionsView 
              webAuthnSupported={webAuthnSupported} 
              largeBlobSupported={largeBlobSupported}
              onCreateNew={() => setShowCreateModal(true)}
            />
            
            {showCreateModal && (
              <CreatePredictionModal
                webAuthnSupported={webAuthnSupported}
                largeBlobSupported={largeBlobSupported}
                onClose={() => setShowCreateModal(false)}
                onSuccess={(message) => showToast(message)}
              />
            )}
          </div>
        )}
      </main>
      
      {toast && <Toast message={toast} />}
    </div>
  );
}

interface AuthViewProps {
  webAuthnSupported: boolean | null;
  largeBlobSupported: boolean | null;
  onAuthSuccess: () => void;
}

function AuthView({ webAuthnSupported, largeBlobSupported, onAuthSuccess }: AuthViewProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useAccount();

  const handleRegister = async () => {
    if (!webAuthnSupported || !largeBlobSupported) {
      setError("Your browser doesn't support the required WebAuthn features.");
      return;
    }

    if (!isConnected) {
      setError("Please connect your wallet first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await registerPasskey();
      onAuthSuccess();
    } catch (error) {
      console.error("Registration error:", error);
      setError(`Failed to register: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!webAuthnSupported || !largeBlobSupported) {
      setError("Your browser doesn't support the required WebAuthn features.");
      return;
    }

    if (!isConnected) {
      setError("Please connect your wallet first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loginWithPasskey();
      onAuthSuccess();
    } catch (error) {
      console.error("Login error:", error);
      setError(`Failed to log in: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Determine if WebAuthn with largeBlob is supported
  const isSupported = webAuthnSupported && largeBlobSupported;

  return (
    <div className="auth-view">
      <h2>{isRegistering ? "Register New Passkey" : "Login with Passkey"}</h2>
      
      {!isConnected && (
        <div className="connect-notice">
          Please connect your wallet to continue
        </div>
      )}
      
      {webAuthnSupported === false && (
        <div className="warning-message">
          WebAuthn is not supported in this browser. You'll need a browser with passkey support.
        </div>
      )}
      
      {webAuthnSupported && largeBlobSupported === false && (
        <div className="warning-message">
          Your browser supports WebAuthn but not the largeBlob extension required for this app.
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {isSupported && (
        <div className="auth-container">
          {isRegistering ? (
            // Registration Form
            <div className="registration-form">
              <p className="auth-description">
                Create a new passkey to securely store your predictions.
              </p>
              
              <button 
                className="action-button"
                onClick={handleRegister}
                disabled={loading || !isConnected}
              >
                {loading ? "Creating Passkey..." : "Create Passkey"}
              </button>
              
              <p className="auth-toggle">
                Already have a passkey?{" "}
                <button 
                  className="text-button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError(null);
                  }}
                >
                  Log in instead
                </button>
              </p>
            </div>
          ) : (
            // Login Form
            <div className="login-form">
              <p className="auth-description">
                Log in with an existing passkey to access your predictions.
              </p>
              
              <button 
                className="action-button"
                onClick={handleLogin}
                disabled={loading || !isConnected}
              >
                {loading ? "Logging In..." : "Login with Passkey"}
              </button>
              
              <p className="auth-toggle">
                Don't have a passkey yet?{" "}
                <button 
                  className="text-button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError(null);
                  }}
                >
                  Register instead
                </button>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PredictionViewProps {
  webAuthnSupported: boolean | null;
  largeBlobSupported: boolean | null;
  onCreateNew?: () => void;
  onClose?: () => void;
  onSuccess?: (message: string) => void;
}

// Helper function to format time ago
const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'}`;
    }
  }
  
  return "just now";
};

// Main predictions view
function PredictionsView({ webAuthnSupported, largeBlobSupported, onCreateNew }: PredictionViewProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useAccount();

  // Load predictions
  useEffect(() => {
    if (isConnected) {
      loadPredictions();
    }
  }, [isConnected, webAuthnSupported, largeBlobSupported]);
  
  // Listen for the prediction-created event
  useEffect(() => {
    const handlePredictionCreated = () => {
      loadPredictions();
    };
    
    window.addEventListener('prediction-created', handlePredictionCreated);
    
    return () => {
      window.removeEventListener('prediction-created', handlePredictionCreated);
    };
  }, []);

  const loadPredictions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from WebAuthn largeBlob if supported
      if (webAuthnSupported && largeBlobSupported) {
        try {
          const webAuthnPredictions = await getAllPredictions();
          setPredictions(webAuthnPredictions);
          setIsLoading(false);
          return;
        } catch (webAuthnError) {
          console.error("Error loading from WebAuthn:", webAuthnError);
        }
      }
      
      // Fall back to localStorage
      const localPredictions = getFromLocalStorage();
      setPredictions(localPredictions);
    } catch (error) {
      console.error("Error loading predictions:", error);
      setError(`Failed to load predictions: ${(error as Error).message}`);
      
      // Last resort fallback to localStorage
      const localPredictions = getFromLocalStorage();
      setPredictions(localPredictions);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReveal = (index: number) => {
    setSelectedIndex(index);
  };

  const [showShareOptions, setShowShareOptions] = useState<number | null>(null);
  
  const handleRevealShare = (index: number) => {
    setShowShareOptions(index);
  };
  
  const shareToTwitter = (prediction: Prediction) => {
    const timeAgo = formatTimeAgo(prediction.timestamp);
    const txLink = prediction.txHash ? 
      `https://sepolia.basescan.org/tx/${prediction.txHash}` : 
      'https://base.org';
    
    const message = `I predicted "${prediction.content}" ${timeAgo} ago. Verified on Base blockchain: ${txLink}`;
    
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
    setShowShareOptions(null);
  };
  
  const shareToWarpcast = (prediction: Prediction) => {
    const timeAgo = formatTimeAgo(prediction.timestamp);
    const txLink = prediction.txHash ? 
      `https://sepolia.basescan.org/tx/${prediction.txHash}` : 
      'https://base.org';
    
    // Include app link for Warpcast - handle both local and GitHub Pages URLs
    const appUrl = window.location.href.includes('github.io') 
      ? 'https://jbrower95.github.io/prediction/'
      : window.location.origin;
    const message = `I predicted "${prediction.content}" ${timeAgo} ago. Verified on Base blockchain: ${txLink}\n\nMake your own predictions at ${appUrl}`;
    
    // Use Farcaster SDK if available
    if (typeof sdk !== 'undefined' && sdk.actions && sdk.actions.openCastComposer) {
      sdk.actions.openCastComposer({
        text: message,
      });
    } else {
      // Fallback to Warpcast website
      window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(message)}`, '_blank');
    }
    setShowShareOptions(null);
  };

  return (
    <div className="predictions-container">
      <h2>Your Predictions</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {!isConnected ? (
        <p className="connect-notice">Connect your wallet to view predictions</p>
      ) : isLoading ? (
        <p className="loading">Loading predictions...</p>
      ) : predictions.length === 0 ? (
        <div className="empty-state">
          <p>No predictions yet</p>
          <button 
            className="action-button"
            onClick={onCreateNew}
          >
            Make Your First Prediction
          </button>
        </div>
      ) : (
        <>
          <div className="predictions-list">
            {predictions.map((prediction, index) => (
              <div 
                className={`prediction-card ${selectedIndex === index ? 'revealed' : ''}`} 
                key={index}
                onClick={() => selectedIndex !== index && handleReveal(index)}
              >
                {selectedIndex === index ? (
                  <>
                    <div className="prediction-revealed">
                      <p className="prediction-content">{prediction.content}</p>
                      <p className="prediction-time">Created {formatTimeAgo(prediction.timestamp)} ago</p>
                      {prediction.txHash && (
                        <p className="prediction-hash">
                          <a 
                            href={`https://sepolia.basescan.org/tx/${prediction.txHash}`} 
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View on BaseScan
                          </a>
                        </p>
                      )}
                    </div>
                    
                    {showShareOptions === index ? (
                      <div className="share-options-container">
                        <p className="share-prompt">Share to:</p>
                        <div className="share-options">
                          <button
                            className="share-option twitter"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareToTwitter(prediction);
                            }}
                          >
                            Twitter
                          </button>
                          <button
                            className="share-option warpcast"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareToWarpcast(prediction);
                            }}
                          >
                            Warpcast
                          </button>
                          <button
                            className="share-option cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowShareOptions(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="share-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevealShare(index);
                        }}
                      >
                        Reveal
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="prediction-locked">
                      <p className="prediction-masked">●●●●●●●●●●●●●●●</p>
                      <p className="prediction-time">Created {formatTimeAgo(prediction.timestamp)} ago</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          
          <button 
            className="new-prediction-button"
            onClick={onCreateNew}
          >
            <span className="plus-icon">+</span>
            <span>Make a Prediction</span>
          </button>
        </>
      )}
    </div>
  );
}

// Modal for creating a new prediction
function CreatePredictionModal({ webAuthnSupported, largeBlobSupported, onClose, onSuccess }: PredictionViewProps) {
  const showToast = onSuccess;
  const [prediction, setPrediction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isConnected } = useAccount();
  const { isLoading: isBlockchainLoading, submitPrediction } = useSubmitPrediction();
  const [error, setError] = useState<string | null>(null);

  const handleCreatePrediction = async () => {
    if (!prediction.trim() || !isConnected) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Generate salt
      const salt = Math.floor(Math.random() * 1000000000).toString();
      const saltedPrediction = `${prediction} (salt: ${salt})`;
      
      // Create hash
      const encoder = new TextEncoder();
      const data = encoder.encode(saltedPrediction);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const predictionHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      
      // Store hash on Base blockchain
      let txHash;
      
      console.log("Generated prediction hash:", predictionHash);
      
      try {
        // If contract address is a placeholder, use mock implementation
        if (PREDICTION_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
          console.log("Using mock implementation (contract not yet deployed)");
          txHash = await mockSubmitPrediction(predictionHash);
        } else {
          // Use actual contract
          console.log("Submitting prediction to contract:", PREDICTION_CONTRACT_ADDRESS);
          txHash = await submitPrediction(predictionHash);
          console.log("Transaction hash received:", txHash);
          
          if (!txHash) {
            throw new Error("No transaction hash returned");
          }
        }
      } catch (blockchainError: any) {
        console.error("Blockchain transaction failed:", blockchainError);
        // Check for specific blockchain errors and provide better error messages
        if (blockchainError.message?.includes("user rejected")) {
          throw new Error("Transaction was rejected in wallet");
        } else if (blockchainError.message?.includes("does not match the target chain") || 
                  blockchainError.message?.includes("network") || 
                  blockchainError.message?.includes("chain")) {
          const errorMsg = "You need to switch to Base Sepolia network. Click the 'Base Sepolia' badge at the top to add it to your wallet.";
          showToast?.(errorMsg);
          throw new Error(errorMsg);
        } else {
          console.warn("Full error details:", blockchainError);
          throw new Error(`Blockchain transaction failed: ${blockchainError.message || "Unknown error"}`);
        }
      }
      
      // Create prediction object
      const newPrediction: Prediction = {
        content: saltedPrediction,
        timestamp: Date.now(),
        hash: predictionHash,
        txHash
      };
      
      // Store the prediction securely
      let stored = false;
      
      if (webAuthnSupported && largeBlobSupported) {
        // Use WebAuthn largeBlob to store the prediction
        stored = await addPrediction(newPrediction);
      }
      
      // Fallback to localStorage if WebAuthn fails or isn't supported
      if (!stored) {
        const existingPredictions = getFromLocalStorage();
        const updatedPredictions = [...existingPredictions, newPrediction];
        storeInLocalStorage(updatedPredictions);
      }
      
      setPrediction("");
      // Refresh the predictions list after creating a new prediction
      window.dispatchEvent(new CustomEvent('prediction-created'));
      // Show success message
      if (onSuccess) onSuccess("Prediction secured successfully!");
      if (onClose) onClose();
    } catch (error) {
      console.error("Error creating prediction:", error);
      setError(`Failed to create prediction: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle clicking outside to close
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (onClose && !isSubmitting) onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isSubmitting]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={modalRef}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Make a Prediction</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <p className="instructions">
          Enter your prediction below. It will be securely stored and can be revealed later with proof of when it was made.
        </p>
        
        <textarea
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          placeholder="Enter your prediction here..."
          disabled={isSubmitting || !isConnected}
          autoFocus
          className="prediction-input"
        />
        
        <div className="modal-actions">
          <button 
            className="cancel-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="action-button"
            onClick={handleCreatePrediction}
            disabled={isSubmitting || isBlockchainLoading || !prediction.trim() || !isConnected}
          >
            {isSubmitting || isBlockchainLoading ? "Securing Prediction..." : "Secure Prediction"}
          </button>
        </div>
        
        {!isConnected && (
          <p className="connect-notice">Connect your wallet to create predictions</p>
        )}
      </div>
    </div>
  );
}

function ConnectMenu() {
  const { isConnected, address, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  
  // Check if we're on Base Sepolia
  const isOnBaseSepolia = chainId === CHAIN_CONFIG.baseSepolia.id;

  if (isConnected) {
    return (
      <div className="connected-account">
        <div className={`network-status ${isOnBaseSepolia ? 'correct-network' : 'wrong-network'}`} 
             title={isOnBaseSepolia ? "Connected to Base Sepolia" : "Wrong network - click Base Sepolia badge to switch"}>
          •
        </div>
        <div className="address">{`${address?.slice(0, 6)}...${address?.slice(-4)}`}</div>
      </div>
    );
  }

  return (
    <button 
      className="connect-button" 
      onClick={() => connect({ connector: connectors[0] })}
    >
      Connect
    </button>
  );
}

export default App;