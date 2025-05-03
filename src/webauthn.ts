/**
 * WebAuthn utilities for storing and retrieving predictions
 * using the largeBlob extension
 */

// Types for our predictions
export interface Prediction {
  content: string; // Original prediction with salt
  timestamp: number; // Creation time
  hash: string; // Hash stored on chain
  txHash?: string; // Transaction hash for verification
}

// Constants
const APP_NAME = 'Prediction App';
const AUTH_KEY = 'prediction_auth';
const EMPTY_CHALLENGE = new Uint8Array(32).fill(1).buffer;

interface AuthState {
  credentialId: string; // Base64 encoded credential ID
  lastUsed: number; // Timestamp
}

// Check if WebAuthn and largeBlob are supported
export function isWebAuthnSupported(): boolean {
  return (
    window.PublicKeyCredential !== undefined &&
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

export async function isLargeBlobSupported(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  
  try {
    // @ts-ignore - TypeScript may not have updated types for this feature
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() &&
      // @ts-ignore
      'largeBlob' in PublicKeyCredential.prototype.getClientExtensionResults();
  } catch (error) {
    console.error('Error checking largeBlob support:', error);
    return false;
  }
}

// Convert between base64 and Uint8Array
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Get saved auth state
export function getAuthState(): AuthState | null {
  const authStateJson = localStorage.getItem(AUTH_KEY);
  if (!authStateJson) return null;
  
  try {
    return JSON.parse(authStateJson) as AuthState;
  } catch (error) {
    console.error('Error parsing auth state:', error);
    return null;
  }
}

// Save auth state
export function saveAuthState(credentialId: string): void {
  const authState: AuthState = {
    credentialId,
    lastUsed: Date.now()
  };
  
  localStorage.setItem(AUTH_KEY, JSON.stringify(authState));
}

// Clear auth state
export function clearAuthState(): void {
  localStorage.removeItem(AUTH_KEY);
}

// Register a new passkey with largeBlob support
export async function registerPasskey(displayName: string = 'Prediction User'): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }
  
  try {
    // Generate a random user ID
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);
    
    // Create credential options
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: new Uint8Array(32).fill(1), // Fixed challenge for simplicity
      rp: {
        name: APP_NAME,
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: 'user',
        displayName: displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        userVerification: 'required',
      },
      // @ts-ignore - TypeScript may not have updated types for largeBlob extension
      extensions: {
        // @ts-ignore
        largeBlob: {
          support: 'required',
        },
      },
    };
    
    // Create the credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;
    
    // Store the credential ID
    const credentialId = bytesToBase64(credential.rawId);
    saveAuthState(credentialId);
    
    // Initialize an empty predictions array in the largeBlob
    const emptyPredictions: Prediction[] = [];
    await storePredictionsToLargeBlob(emptyPredictions, credential.rawId);
    
    return credentialId;
  } catch (error) {
    console.error('Error creating passkey:', error);
    throw error;
  }
}

// Log in with an existing passkey
export async function loginWithPasskey(): Promise<{ 
  credentialId: string; 
  hasData: boolean;
  predictions: Prediction[];
}> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }
  
  try {
    // Get credential with largeBlob
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: EMPTY_CHALLENGE,
        userVerification: 'required',
        // @ts-ignore - TypeScript may not have updated types for largeBlob extension
        extensions: {
          // @ts-ignore
          largeBlob: {
            read: true,
          },
        },
      },
      mediation: 'required', // Show passkey selection dialog
    }) as PublicKeyCredential;
    
    // Save the credential ID
    const credentialId = bytesToBase64(credential.rawId);
    saveAuthState(credentialId);
    
    // Get predictions from largeBlob
    // @ts-ignore - TypeScript may not have updated types for largeBlob
    const extensionResults = credential.getClientExtensionResults();
    
    // @ts-ignore
    const blobData = extensionResults.largeBlob?.blob;
    let predictions: Prediction[] = [];
    
    if (blobData) {
      try {
        const predictionsData = new TextDecoder().decode(blobData);
        predictions = JSON.parse(predictionsData) as Prediction[];
      } catch (error) {
        console.error('Error parsing predictions from largeBlob:', error);
      }
    }
    
    return { 
      credentialId, 
      hasData: !!blobData,
      predictions: predictions,
    };
  } catch (error) {
    console.error('Error logging in with passkey:', error);
    throw error;
  }
}

// Store predictions in the largeBlob of a specific credential
export async function storePredictionsToLargeBlob(
  predictions: Prediction[], 
  credentialId: BufferSource
): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }
  
  try {
    // Serialize predictions to store in largeBlob
    const predictionsData = JSON.stringify(predictions);
    const predictionsBuffer = new TextEncoder().encode(predictionsData);
    
    // Create get options
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: EMPTY_CHALLENGE,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: credentialId,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
      // @ts-ignore - TypeScript may not have updated types for largeBlob extension
      extensions: {
        // @ts-ignore
        largeBlob: {
          write: predictionsBuffer,
        },
      },
    };
    
    // Get the credential and write to largeBlob
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;
    
    // @ts-ignore - TypeScript may not have updated types for largeBlob
    const extensionsResults = assertion.getClientExtensionResults();
    
    // Check if the write was successful
    // @ts-ignore
    return extensionsResults.largeBlob?.written === true;
  } catch (error) {
    console.error('Error storing predictions in largeBlob:', error);
    return false;
  }
}

// Get predictions from the largeBlob of a specific credential
export async function getPredictionsFromLargeBlob(credentialId: BufferSource): Promise<Prediction[] | null> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }
  
  try {
    // Create get options
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: EMPTY_CHALLENGE,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: credentialId,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
      // @ts-ignore - TypeScript may not have updated types for largeBlob extension
      extensions: {
        // @ts-ignore
        largeBlob: {
          read: true,
        },
      },
    };
    
    // Get the credential and read from largeBlob
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;
    
    // @ts-ignore - TypeScript may not have updated types for largeBlob
    const extensionsResults = assertion.getClientExtensionResults();
    
    // Parse the retrieved predictions
    // @ts-ignore
    if (extensionsResults.largeBlob?.blob) {
      // @ts-ignore
      const blobData = extensionsResults.largeBlob.blob;
      const predictionsData = new TextDecoder().decode(blobData);
      return JSON.parse(predictionsData) as Prediction[];
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving predictions from largeBlob:', error);
    return null;
  }
}

// Add a prediction to the current largeBlob
export async function addPrediction(prediction: Prediction): Promise<boolean> {
  const authState = getAuthState();
  if (!authState) {
    throw new Error('Not authenticated. Log in first.');
  }
  
  const credentialId = base64ToBytes(authState.credentialId);
  
  // Get existing predictions
  const existingPredictions = await getPredictionsFromLargeBlob(credentialId) || [];
  
  // Add new prediction
  const updatedPredictions = [...existingPredictions, prediction];
  
  // Store updated predictions
  return await storePredictionsToLargeBlob(updatedPredictions, credentialId);
}

// Get all predictions for the current user
export async function getAllPredictions(): Promise<Prediction[]> {
  const authState = getAuthState();
  if (!authState) {
    throw new Error('Not authenticated. Log in first.');
  }
  
  const credentialId = base64ToBytes(authState.credentialId);
  return await getPredictionsFromLargeBlob(credentialId) || [];
}

// Fallback functions for development/testing or browsers without WebAuthn support
export function storeInLocalStorage(predictions: Prediction[]): void {
  localStorage.setItem('predictions', JSON.stringify(predictions));
}

export function getFromLocalStorage(): Prediction[] {
  const data = localStorage.getItem('predictions');
  return data ? JSON.parse(data) : [];
}