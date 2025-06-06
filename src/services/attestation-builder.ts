/**
 * Attestation data builder service
 * Creates compact attestation data from user authentication and document information
 */

import { providers } from '@/types/auth';
import type { AttestationData } from '@/types/qrcode';

/**
 * Input data for building attestation
 */
export interface AttestationInput {
  /** Document hash information */
  documentHashes: {
    cryptographic: string;
    pHash: string;
    dHash: string;
  };
  /** User authentication information */
  identity: {
    provider: string; // provider.id
    identifier: string; // email/username
  };
  /** Service information */
  serviceInfo: {
    publicKeyId: string;
  };
  /** Optional user-provided URL */
  userUrl?: string;
}

/**
 * Service for building compact attestation data
 */
export class AttestationBuilder {
  /**
   * Build compact attestation data from full user data
   * 
   * @param input - Full attestation input data
   * @returns Compact attestation data ready for QR encoding
   */
  buildCompactAttestation(input: AttestationInput): AttestationData {
    const provider = providers.find((p: any) => p.id === input.identity.provider);
    
    if (!provider) {
      throw new Error(`Unknown provider: ${input.identity.provider}`);
    }

    return {
      h: {
        c: input.documentHashes.cryptographic,
        p: {
          p: input.documentHashes.pHash,
          d: input.documentHashes.dHash
        }
      },
      t: new Date().toISOString(),
      i: {
        p: provider.compactId,
        id: input.identity.identifier
      },
      s: {
        n: 'sc', // seal.codes shortened
        k: input.serviceInfo.publicKeyId
      },
      ...(input.userUrl && { u: input.userUrl })
    };
  }

  /**
   * Validate attestation input data
   * 
   * @param input - Input data to validate
   * @returns True if valid, throws error if invalid
   */
  validateInput(input: AttestationInput): boolean {
    // Validate provider exists
    const provider = providers.find((p: any) => p.id === input.identity.provider);
    if (!provider) {
      throw new Error(`Unknown provider: ${input.identity.provider}`);
    }

    // Validate required fields
    if (!input.documentHashes.cryptographic) {
      throw new Error('Cryptographic hash is required');
    }
    
    if (!input.documentHashes.pHash) {
      throw new Error('pHash is required');
    }
    
    if (!input.documentHashes.dHash) {
      throw new Error('dHash is required');
    }
    
    if (!input.identity.identifier) {
      throw new Error('User identifier is required');
    }
    
    if (!input.serviceInfo.publicKeyId) {
      throw new Error('Public key ID is required');
    }

    return true;
  }

  /**
   * Estimate the size of the resulting attestation data
   * Useful for checking if it will fit in QR code
   * 
   * @param input - Input data to estimate
   * @returns Estimated size in bytes
   */
  estimateSize(input: AttestationInput): number {
    const attestation = this.buildCompactAttestation(input);
    return JSON.stringify(attestation).length;
  }

  /**
   * Get all supported provider compact IDs
   * 
   * @returns Array of provider compact IDs
   */
  getSupportedProviders(): Array<{ id: string; compactId: string; name: string }> {
    return providers.map((p: any) => ({
      id: p.id,
      compactId: p.compactId,
      name: p.name
    }));
  }
}

/**
 * Default attestation builder instance
 */
export const attestationBuilder = new AttestationBuilder();
