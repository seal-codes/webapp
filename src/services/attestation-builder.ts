/**
 * Attestation data builder service
 * Creates compact attestation data from user authentication and document information
 */

import { providers } from '@/types/auth'
import type { AttestationData, QRCodeExclusionZone } from '@/types/qrcode'
import type { Provider } from '@/types/auth'

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
  /** QR code exclusion zone for verification */
  exclusionZone: QRCodeExclusionZone;
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
    const provider = providers.find((p: Provider) => p.id === input.identity.provider)
    
    if (!provider) {
      throw new Error(`Unknown provider: ${input.identity.provider}`)
    }

    return {
      h: {
        c: input.documentHashes.cryptographic,
        p: {
          p: input.documentHashes.pHash,
          d: input.documentHashes.dHash,
        },
      },
      t: new Date().toISOString(),
      i: {
        p: provider.compactId,
        id: input.identity.identifier,
      },
      s: {
        n: 'sc', // seal.codes shortened
        k: input.serviceInfo.publicKeyId,
      },
      e: {
        x: input.exclusionZone.x,
        y: input.exclusionZone.y,
        w: input.exclusionZone.width,
        h: input.exclusionZone.height,
        f: input.exclusionZone.fillColor.replace('#', ''), // Remove # for compactness
      },
      ...(input.userUrl && { u: input.userUrl }),
    }
  }

  /**
   * Extract exclusion zone from compact attestation data
   * 
   * @param attestationData - Compact attestation data
   * @returns Exclusion zone configuration
   */
  extractExclusionZone(attestationData: AttestationData): QRCodeExclusionZone {
    return {
      x: attestationData.e.x,
      y: attestationData.e.y,
      width: attestationData.e.w,
      height: attestationData.e.h,
      fillColor: `#${attestationData.e.f}`, // Add # back
    }
  }

  /**
   * Validate attestation input data
   * 
   * @param input - Input data to validate
   * @returns True if valid, throws error if invalid
   */
  // eslint-disable-next-line complexity
  validateInput(input: AttestationInput): boolean {
    // Validate provider exists
    const provider = providers.find((p: Provider) => p.id === input.identity.provider)
    if (!provider) {
      throw new Error(`Unknown provider: ${input.identity.provider}`)
    }

    // Validate required fields
    if (!input.documentHashes.cryptographic) {
      throw new Error('Cryptographic hash is required')
    }
    
    if (!input.documentHashes.pHash) {
      throw new Error('pHash is required')
    }
    
    if (!input.documentHashes.dHash) {
      throw new Error('dHash is required')
    }
    
    if (!input.identity.identifier) {
      throw new Error('User identifier is required')
    }
    
    if (!input.serviceInfo.publicKeyId) {
      throw new Error('Public key ID is required')
    }

    // Validate exclusion zone
    if (!input.exclusionZone) {
      throw new Error('Exclusion zone is required')
    }

    if (input.exclusionZone.x < 0 || input.exclusionZone.y < 0) {
      throw new Error('Exclusion zone position must be non-negative')
    }

    if (input.exclusionZone.width <= 0 || input.exclusionZone.height <= 0) {
      throw new Error('Exclusion zone dimensions must be positive')
    }

    return true
  }

  /**
   * Estimate the size of the resulting attestation data
   * Useful for checking if it will fit in QR code
   * 
   * @param input - Input data to estimate
   * @returns Estimated size in bytes
   */
  estimateSize(input: AttestationInput): number {
    const attestation = this.buildCompactAttestation(input)
    return JSON.stringify(attestation).length
  }

  /**
   * Get all supported provider compact IDs
   * 
   * @returns Array of provider compact IDs
   */
  getSupportedProviders(): Array<{ id: string; compactId: string; name: string }> {
    return providers.map((p: Provider) => ({
      id: p.id,
      compactId: p.compactId,
      name: p.name,
    }))
  }
}

/**
 * Default attestation builder instance
 */
export const attestationBuilder = new AttestationBuilder()