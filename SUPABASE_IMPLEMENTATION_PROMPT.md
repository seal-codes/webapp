# LLM Implementation Prompt: Supabase Backend for seal.codes MVP

## Context and Objective

You are implementing a backend service for seal.codes, a document attestation system. The system currently has a complete frontend implementation with mock authentication. You need to replace the mock authentication with a real Supabase-based backend that handles OAuth authentication and provides cryptographic signing services.

**CRITICAL**: The server does NOT create attestation packages. The client creates the complete attestation package and sends it to the server for timestamp addition and cryptographic signing only.

## Current System Architecture

The frontend is a Vue.js application with:
- Mock authentication in `src/stores/documentStore.ts` 
- Complete document processing (hashing, QR generation, embedding) on client-side
- `AttestationBuilder` service that creates complete attestation packages client-side
- Verification system that validates signed attestations

## Server-Side Responsibilities (VERY LIMITED)

The server has exactly 3 responsibilities:
1. **Identity Verification**: Validate OAuth token to confirm user identity
2. **Timestamp Authority**: Add authoritative server timestamp 
3. **Cryptographic Signing**: Sign the attestation package with service private key

The server does NOT:
- Process documents or calculate hashes
- Create attestation packages
- Generate QR codes
- Store user data beyond authentication

## Required Implementation

### 1. Supabase Project Setup

Create a new Supabase project. I'll configure the auth providers lateron.
Provide a table which exposes metadata about the implemented auth providers to the client.

### 2. Edge Function: sign-attestation

Create `supabase/functions/sign-attestation/index.ts` that:

**Input**: Receives POST request with a json string. It's not important to you what's in it, you should just sign it and thus ensure is non-manipulation.

**Processing**:
1. Verify user authentication using Authorization header
2. Validate that the identity in attestationPackage matches the authenticated user
3. Add server timestamp: `attestationPackage.timestamp = new Date().toISOString()`
4. Add public key ID: `attestationPackage.serviceInfo.publicKeyId = "mvp-key-2024"`
5. Sign the complete attestation package using Ed25519 private key
6. Return signature, public key, and timestamp

**Output**:
```typescript
{
  timestamp: "2024-06-13T04:00:00Z",
  signature: "base64-encoded-signature",
  publicKey: "base64-encoded-public-key", 
  publicKeyId: "mvp-key-2024"
}
```

### 3. Frontend Authentication Service

Create `src/services/supabase-client.ts`:
- Initialize Supabase client with project credentials
- Export configured client

Create `src/services/auth-service.ts`:
- `signInWithProvider(provider)` - OAuth sign-in
- `getSession()` - Get current session  
- `signOut()` - Sign out user
- `onAuthStateChange()` - Listen for auth changes

### 4. Frontend Signing Service  

Create `src/services/signing-service.ts`:
- `signAttestation(attestationPackage)` - Send package to Edge Function
- Handle authentication errors
- Return signature, public key, and timestamp
- Client combines these with original package

### 5. Update Document Store

Modify `src/stores/documentStore.ts`:
- Replace mock `authenticateWith()` with real Supabase authentication
- Update to use real user data from Supabase session
- When sealing document:
  1. Build attestation package client-side (existing code)
  2. Send to signing service
  3. Combine returned signature with original package
  4. Generate QR code with signed package (existing code)

### 6. Update Attestation Builder

Modify `src/services/attestation-builder.ts`:
- Keep all existing attestation package creation logic
- Add method to combine server response with client package:
```typescript
combineWithServerSignature(
  clientPackage: AttestationPackage, 
  serverResponse: { timestamp: string, signature: string, publicKey: string, publicKeyId: string }
): SignedAttestationPackage
```

### 7. Environment Configuration

Set up environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ATTESTATION_PRIVATE_KEY` - Ed25519 private key (PEM format) for Edge Function

### 8. Key Management

Generate Ed25519 key pair for MVP:
- Create private key for server-side signing
- Make public key available for verification
- Store private key securely in Supabase Edge Function environment

## Technical Requirements

- Use Ed25519 for cryptographic signatures
- Server only adds timestamp and signature to client-created packages
- Preserve all existing client-side document processing
- Only send attestation packages to server, never documents or hashes alone
- Handle authentication errors gracefully
- Support both Google and GitHub OAuth providers

## Integration Points

The new backend must integrate with existing frontend services:
- `AttestationBuilder` creates packages and combines with server signature
- `QRCodeService` embeds the final signed attestation data
- `VerificationService` validates signatures using embedded public keys

## Data Flow Clarification

1. **Client**: Creates complete attestation package (including hashes, identity, exclusion zone)
2. **Client**: Sends package to server for signing
3. **Server**: Adds timestamp, adds publicKeyId, signs complete package
4. **Server**: Returns signature + public key + timestamp
5. **Client**: Combines original package with server signature
6. **Client**: Generates QR code with final signed package

## Constraints

- Server must NOT create attestation packages
- Server must NOT process documents or calculate hashes
- Server must NOT modify attestation content except adding timestamp and publicKeyId
- Maintain the same user interface flow
- Keep all document processing client-side for privacy

## Success Criteria

- Users can authenticate with Google/GitHub OAuth
- Server adds authoritative timestamps and cryptographic signatures
- Client receives signature components and combines them properly
- Existing verification system can validate the signatures
- No changes needed to document processing or QR code generation logic

Implement this backend service following the exact specifications above, ensuring the server has minimal responsibilities and the client retains full control over attestation package creation.
