import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { 
  Prediction, 
  createPasskey, 
  getCredentialId, 
  isLargeBlobSupported, 
  isWebAuthnSupported, 
  retrievePredictions, 
  storePredictions,
  storeInLocalStorage,
  getFromLocalStorage
} from "./webauthn";
import { mockStorePrediction, useStorePrediction } from "./blockchain";

function App() {
  const [activeView, setActiveView] = useState<"create" | "reveal">("create");
  const [theme] = useState<"dark" | "light">("dark");
  const [webAuthnSupported, setWebAuthnSupported] = useState<boolean | null>(null);
  const [largeBlobSupported, setLargeBlobSupported] = useState<boolean | null>(null);

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
    
    checkWebAuthnSupport();
  }, [theme]);

  return (
    <div className="app-container">
      <header>
        <h1>PREDICTION</h1>
        <ConnectMenu />
      </header>

      <main>
        <div className="tab-container">
          <button 
            className={`tab ${activeView === "create" ? "active" : ""}`}
            onClick={() => setActiveView("create")}
          >
            CREATE
          </button>
          <button 
            className={`tab ${activeView === "reveal" ? "active" : ""}`}
            onClick={() => setActiveView("reveal")}
          >
            REVEAL
          </button>
        </div>

        <div className="view-container">
          {activeView === "create" ? (
            <CreatePredictionView 
              webAuthnSupported={webAuthnSupported} 
              largeBlobSupported={largeBlobSupported} 
            />
          ) : (
            <RevealPredictionView 
              webAuthnSupported={webAuthnSupported} 
              largeBlobSupported={largeBlobSupported} 
            />
          )}
        </div>
      </main>
    </div>
  );
}

interface PredictionViewProps {
  webAuthnSupported: boolean | null;
  largeBlobSupported: boolean | null;
}

function CreatePredictionView({ webAuthnSupported, largeBlobSupported }: PredictionViewProps) {
  const [prediction, setPrediction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passkeyRequired, setPasskeyRequired] = useState(false);
  const { isConnected } = useAccount();
  const { isLoading: isBlockchainLoading } = useStorePrediction();

  // Check if passkey exists
  useEffect(() => {
    const credentialId = getCredentialId();
    setPasskeyRequired(!credentialId);
  }, []);

  const handleCreatePasskey = async () => {
    try {
      setIsSubmitting(true);
      const credentialId = await createPasskey();
      if (credentialId) {
        setPasskeyRequired(false);
      } else {
        alert("Failed to create passkey");
      }
    } catch (error) {
      console.error("Error creating passkey:", error);
      alert("Failed to create passkey: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePrediction = async () => {
    if (!prediction.trim() || !isConnected) return;
    
    try {
      setIsSubmitting(true);
      
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
      
      // Store hash on Base blockchain (using mock for now)
      const txHash = await mockStorePrediction(predictionHash);
      
      // Create prediction object
      const newPrediction: Prediction = {
        content: saltedPrediction,
        timestamp: Date.now(),
        hash: predictionHash,
        txHash
      };
      
      // Store in WebAuthn if supported, otherwise fallback to localStorage
      let stored = false;
      
      if (webAuthnSupported && largeBlobSupported) {
        // Get existing predictions
        const existingPredictions = await retrievePredictions() || [];
        
        // Add new prediction
        const updatedPredictions = [...existingPredictions, newPrediction];
        
        // Store in largeBlob
        stored = await storePredictions(updatedPredictions);
      }
      
      // Fallback to localStorage if WebAuthn fails or isn't supported
      if (!stored) {
        const existingPredictions = getFromLocalStorage();
        const updatedPredictions = [...existingPredictions, newPrediction];
        storeInLocalStorage(updatedPredictions);
      }
      
      setPrediction("");
      alert("Prediction created and secured!");
    } catch (error) {
      console.error("Error creating prediction:", error);
      alert("Failed to create prediction: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-view">
      <h2>Create New Prediction</h2>
      
      {!webAuthnSupported && webAuthnSupported !== null && (
        <div className="warning-message">
          WebAuthn is not supported in this browser. Your predictions will be stored locally but cannot be securely bound to your device.
        </div>
      )}
      
      {webAuthnSupported && !largeBlobSupported && largeBlobSupported !== null && (
        <div className="warning-message">
          Your browser supports WebAuthn but not the largeBlob extension. Your predictions will be stored locally but cannot be securely bound to your device.
        </div>
      )}
      
      {webAuthnSupported && largeBlobSupported && passkeyRequired && (
        <div className="passkey-setup">
          <p>You need to create a passkey to securely store your predictions.</p>
          <button 
            className="action-button"
            onClick={handleCreatePasskey}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Passkey..." : "Create Passkey"}
          </button>
        </div>
      )}
      
      {(!passkeyRequired || !webAuthnSupported || !largeBlobSupported) && (
        <>
          <p className="instructions">
            Enter your prediction below. It will be securely stored and can be revealed later with proof of when it was made.
          </p>
          
          <textarea
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="Enter your prediction here..."
            disabled={isSubmitting || !isConnected}
          />
          
          <button 
            className="action-button"
            onClick={handleCreatePrediction}
            disabled={isSubmitting || isBlockchainLoading || !prediction.trim() || !isConnected}
          >
            {isSubmitting || isBlockchainLoading ? "Securing Prediction..." : "Secure Prediction"}
          </button>
          
          {!isConnected && (
            <p className="connect-notice">Connect your wallet to create predictions</p>
          )}
        </>
      )}
    </div>
  );
}

function RevealPredictionView({ webAuthnSupported, largeBlobSupported }: PredictionViewProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected } = useAccount();

  // Load predictions
  useEffect(() => {
    if (isConnected) {
      const loadPredictions = async () => {
        setIsLoading(true);
        try {
          // Try to load from WebAuthn if supported
          if (webAuthnSupported && largeBlobSupported) {
            const webAuthnPredictions = await retrievePredictions();
            if (webAuthnPredictions && webAuthnPredictions.length > 0) {
              setPredictions(webAuthnPredictions);
              setIsLoading(false);
              return;
            }
          }
          
          // Fall back to localStorage
          const localPredictions = getFromLocalStorage();
          setPredictions(localPredictions);
        } catch (error) {
          console.error("Error loading predictions:", error);
          // Fall back to localStorage
          const localPredictions = getFromLocalStorage();
          setPredictions(localPredictions);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadPredictions();
    }
  }, [isConnected, webAuthnSupported, largeBlobSupported]);

  const handleReveal = (index: number) => {
    setSelectedIndex(index);
  };

  const handleShare = (prediction: Prediction) => {
    const timeAgo = formatTimeAgo(prediction.timestamp);
    const txLink = prediction.txHash ? 
      `https://basescan.org/tx/${prediction.txHash}` : 
      'https://base.org';
    
    const message = `I predicted "${prediction.content}" ${timeAgo} ago. Verified on Base blockchain: ${txLink}`;
    
    // Share to Twitter
    sdk.actions.openUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`);
  };

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

  return (
    <div className="reveal-view">
      <h2>Your Predictions</h2>
      
      {!isConnected ? (
        <p className="connect-notice">Connect your wallet to view predictions</p>
      ) : isLoading ? (
        <p className="loading">Loading predictions...</p>
      ) : predictions.length === 0 ? (
        <p className="no-predictions">No predictions found</p>
      ) : (
        <div className="predictions-list">
          {predictions.map((prediction, index) => (
            <div className="prediction-item" key={index}>
              {selectedIndex === index ? (
                <>
                  <p className="prediction-content">{prediction.content}</p>
                  <p className="prediction-time">Created {formatTimeAgo(prediction.timestamp)} ago</p>
                  {prediction.txHash && (
                    <p className="prediction-hash">
                      <a 
                        href={`https://basescan.org/tx/${prediction.txHash}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on BaseScan
                      </a>
                    </p>
                  )}
                  <button
                    className="share-button"
                    onClick={() => handleShare(prediction)}
                  >
                    Share
                  </button>
                </>
              ) : (
                <>
                  <p className="prediction-masked">●●●●●●●●●●●●●●●</p>
                  <p className="prediction-time">Created {formatTimeAgo(prediction.timestamp)} ago</p>
                  <button
                    className="reveal-button"
                    onClick={() => handleReveal(index)}
                  >
                    Reveal
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectMenu() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return (
      <div className="connected-account">
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