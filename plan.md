# Prediction App Implementation Plan

## Architecture

### Frontend
- React + TypeScript app with Vite
- Dark arcade-like UI (neutral colors, dotted lines)
- Responsive design for mobile-first experience

### Backend & Storage
- Base blockchain for storing prediction hashes
- WebAuthn's largeBlob for storing original predictions locally
- Farcaster integration for sharing

## Core Features

1. **Prediction Creation**
   - Text input for prediction content
   - Generate random salt and append to prediction
   - Hash the salted prediction
   - Store hash on Base blockchain
   - Store original text + salt in WebAuthn largeBlob

2. **Prediction Verification**
   - Retrieve stored prediction from WebAuthn largeBlob
   - Verify hash against blockchain record
   - Display verification results

3. **Prediction Sharing**
   - Share to Twitter/Farcaster with proof of timestamp
   - Include transaction link for verification

## Technical Components

1. **WebAuthn Integration**
   - Implement passkey creation and retrieval
   - Use largeBlob API for prediction storage
   - Handle authentication flows

2. **Blockchain Integration**
   - Connect to Base via Wagmi
   - Deploy simple storage contract (if needed)
   - Transaction handling for prediction submission

3. **Cryptographic Functions**
   - Salt generation
   - Secure hashing (SHA-256)
   - Hash verification

4. **User Interface**
   - Create prediction form
   - Prediction list/history view
   - Verification result display
   - Share functionality

## Implementation Phases

1. **Phase 1: Core App Setup**
   - Project structure and dependencies
   - WebAuthn implementation
   - Basic UI framework

2. **Phase 2: Blockchain Integration**
   - Base connection
   - Transaction handling
   - Hash storage and retrieval

3. **Phase 3: UI Development**
   - Arcade-style theme implementation
   - Responsive layouts
   - Animations and transitions

4. **Phase 4: Sharing & Polish**
   - Twitter/Farcaster integration
   - Error handling
   - Performance optimization
   - Testing