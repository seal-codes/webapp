# Zign.codes Architecture

This document outlines the technical architecture of Zign.codes, a system for creating self-contained document attestations using social authentication.

## System Overview

Zign.codes is designed as a web application that allows users to create verifiable attestations of document ownership using their existing social identities. The system generates QR codes containing all necessary verification data, enabling offline verification without requiring continuous server availability.

## Core Components

1. **Web Application**: Frontend interface for document upload and attestation generation
2. **Authentication Module**: Handles social login integration
3. **Document Processing Engine**: Creates document hashes and manages file handling
4. **Attestation Generator**: Creates the signed attestation package
5. **QR Code Generator**: Encodes the attestation into a scannable format
6. **Verification Library**: Client-side code for verifying attestations
7. **Optional Verification Service**: Server endpoint for enhanced verification

## Data Flow

### Document Signing Process

```mermaid
sequenceDiagram
    actor User
    participant WebApp as Web Application
    participant Auth as Authentication Module
    participant DocEngine as Document Processing
    participant AttestGen as Attestation Generator
    participant QRGen as QR Code Generator
    
    User->>WebApp: Upload document
    WebApp->>DocEngine: Process document
    DocEngine->>WebApp: Return document hash
    
    User->>WebApp: Request attestation
    WebApp->>Auth: Redirect to social login
    Auth->>User: Present login interface
    User->>Auth: Provide credentials
    Auth->>WebApp: Return authentication token
    
    WebApp->>AttestGen: Request attestation creation
    AttestGen->>AttestGen: Generate key pair (if needed)
    AttestGen->>AttestGen: Create attestation package
    AttestGen->>AttestGen: Sign with service private key
    AttestGen->>WebApp: Return signed attestation
    
    WebApp->>QRGen: Generate QR code
    QRGen->>WebApp: Return QR code image
    WebApp->>User: Present QR code for download
```

### Verification Process

```mermaid
sequenceDiagram
    actor Verifier
    participant QRScanner as QR Scanner App
    participant VerLib as Verification Library
    participant VerService as Verification Service (Optional)
    
    Verifier->>QRScanner: Scan QR code
    QRScanner->>VerLib: Extract attestation data
    VerLib->>VerLib: Parse attestation package
    VerLib->>VerLib: Verify signature with public key
    
    alt Basic Verification
        VerLib->>Verifier: Display attestation details
    else Enhanced Verification (Online)
        VerLib->>VerService: Request verification
        VerService->>VerService: Validate attestation
        VerService->>VerLib: Return verification result
        VerLib->>Verifier: Display verification result
    end
```

## Attestation Package Structure

The attestation package is the core data structure that gets encoded into the QR code. It contains all information needed for verification.

```json
{
  "version": "1.0",
  "documentHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "timestamp": "2023-05-21T13:45:30Z",
  "identity": {
    "provider": "google",
    "identifier": "user@example.com",
    "displayName": "User Name"
  },
  "serviceInfo": {
    "name": "Zign.codes",
    "publicKeyId": "key-2023-05"
  },
  "signature": "base64-encoded-signature-data"
}
```

## Security Considerations

### Hybrid Verification Approach

Zign.codes uses a hybrid approach to verification:

1. **Self-contained verification**: The QR code contains all data needed for basic verification
2. **Cryptographic verification**: The attestation is signed by the service's private key
3. **Optional online verification**: Enhanced verification can be performed online

This approach provides flexibility while maintaining security:

```mermaid
flowchart TD
    A[Scan QR Code] --> B[Extract Attestation Data]
    B --> C{Verification Level}
    C -->|Basic| D[Display Raw Data]
    C -->|Cryptographic| E[Verify Signature]
    C -->|Enhanced| F[Online Verification]
    
    E -->|Valid| G[Signature Valid]
    E -->|Invalid| H[Signature Invalid]
    
    F -->|Valid| I[Full Verification Passed]
    F -->|Invalid| J[Verification Failed]
```

### Key Management

The service uses asymmetric cryptography to sign attestations:

1. A private key is securely stored on the server
2. The corresponding public key is either:
   - Embedded in the attestation package
   - Referenced by ID and retrievable from a public key server
3. Keys are rotated periodically for security

## Technical Implementation Details

### Document Hash Generation

Documents are hashed using SHA-256 to create a unique fingerprint:

```mermaid
flowchart LR
    A[Document] --> B[SHA-256 Algorithm]
    B --> C[Document Hash]
```

### QR Code Capacity Considerations

QR codes have limited data capacity:

- Version 1: ~20 bytes
- Version 25: ~2,000 bytes
- Version 40: ~3,000 bytes

To handle this limitation, the system:
1. Uses compact data formats
2. Implements data compression
3. For larger attestations, may split across multiple QR codes

### Offline Verification Process

The verification library is designed to work offline:

```mermaid
sequenceDiagram
    actor Verifier
    participant VerLib as Verification Library
    
    Verifier->>VerLib: Input QR code data
    VerLib->>VerLib: Extract attestation package
    VerLib->>VerLib: Verify signature using embedded public key
    VerLib->>VerLib: Check document hash (if document available)
    VerLib->>Verifier: Display verification results
```

## Integration Capabilities

### Social Authentication Providers

The initial implementation supports these providers:
- Google
- Facebook
- Twitter/X
- GitHub
- Microsoft

### Future Identity Provider Integration

The system is designed to accommodate stronger identity verification methods:

```mermaid
flowchart TD
    A[Identity Verification] --> B{Provider Type}
    B --> C[Social Accounts]
    B --> D[Government IDs]
    B --> E[Professional Credentials]
    
    C --> F[Basic Trust Level]
    D --> G[Enhanced Trust Level]
    E --> H[Professional Trust Level]
```

## Deployment Architecture

Zign.codes is designed as a cloud-native application:

```mermaid
flowchart TD
    A[User] --> B[CDN]
    B --> C[Static Web Assets]
    A --> D[API Gateway]
    D --> E[Authentication Service]
    D --> F[Document Processing Service]
    D --> G[Attestation Service]
    D --> H[Verification Service]
    
    E --> I[(Identity Provider)]
    F --> J[(Object Storage)]
    G --> K[(Key Management)]
    H --> L[(Verification Records)]
```

## Development Roadmap

1. **MVP Phase**:
   - Basic web application
   - Social authentication
   - QR code generation
   - Offline verification

2. **Enhancement Phase**:
   - Additional identity providers
   - Mobile applications
   - Document type-specific features
   - API for third-party integration

3. **Enterprise Phase**:
   - Organization accounts
   - Bulk processing
   - Advanced analytics
   - Custom branding
