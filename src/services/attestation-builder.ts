/**
 * Attestation data builder service
 * Creates compact attestation data from user authentication and document information
 */

import { providers } from '@/types/auth'
import type { AttestationData, QRCodeExclusionZone } from '@/types/qrcode'
import type { Provider } from '@/types/auth'
import type { AttestationPackage, SigningResponse } from './signing-service'
import type { AllDocumentHashes } from './document-hash-service'

/**
 * Input data for building attestation
 */
export interface AttestationInput {
  /** Document hash information (images or PDFs) */
  documentHashes: AllDocumentHashes;
  /** User authentication information */
  identity: {
    provider: string; // provider.id
    identifier: string; // email/username
  };
  /** Service information */
  serviceInfo: {
    publicKeyId: string;
  };
  /** QR code exclusion zone for verification (images only) */
  exclusionZone?: QRCodeExclusionZone;
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
    
    // Normalize hashes for both image and PDF documents
    const normalizedHashes = this.normalizeHashes(input.documentHashes)
    
    const attestationData: AttestationData = {
      h: {
        c: normalizedHashes.cryptographic,
        p: {
          p: normalizedHashes.perceptual,
          d: normalizedHashes.dHash || '', // May be empty for PDFs
        },
      },
      t: new Date().toISOString(),
      i: {
        p: provider.compactId,
        id: input.identity.identifier,
      },
      s: {
        n: 'seal.codes',
        k: input.serviceInfo.publicKeyId,
      },
      // Only include exclusion zone for images
      ...(input.exclusionZone && {
        e: {
          x: input.exclusionZone.x,
          y: input.exclusionZone.y,
          w: input.exclusionZone.width,
          h: input.exclusionZone.height,
          f: input.exclusionZone.fillColor.replace('#', ''),
        },
      }),
      ...(input.userUrl && { u: input.userUrl }),
    }
    
    return attestationData
  }
  
  /**
   * Normalize hashes from different document types
   */
  private normalizeHashes(hashes: AllDocumentHashes) {
    if ('compositePerceptual' in hashes) {
      // PDF hashes
      return {
        cryptographic: hashes.cryptographic,
        perceptual: hashes.compositePerceptual,
        dHash: '', // PDFs don't use dHash
      }
    } else {
      // Image hashes
      return {
        cryptographic: hashes.cryptographic,
        perceptual: hashes.pHash,
        dHash: hashes.dHash,
      }
    }
  }

  /**
   * Build attestation package for server signing (without timestamp and service info)
   * 
   * @param input - Full attestation input data
   * @returns Attestation package ready for server signing
   */
  buildAttestationPackage(input: Omit<AttestationInput, 'serviceInfo'>): AttestationPackage {
    // Normalize hashes for the package
    const normalizedHashes = this.normalizeHashes(input.documentHashes)
    
    return {
      hashes: {
        cryptographic: normalizedHashes.cryptographic,
        pHash: normalizedHashes.perceptual,
        dHash: normalizedHashes.dHash,
      },
      identity: input.identity,
      // Only include exclusion zone if provided (images only)
      ...(input.exclusionZone && {
        exclusionZone: {
          x: input.exclusionZone.x,
          y: input.exclusionZone.y,
          width: input.exclusionZone.width,
          height: input.exclusionZone.height,
          fillColor: input.exclusionZone.fillColor,
        },
      }),
      ...(input.userUrl && { userUrl: input.userUrl }),
    }
  }

  /**
   * Combine server signature with client attestation package
   * NOTE: No longer includes public key in attestation data for space savings
   * 
   * @param clientPackage - Original attestation package from client
   * @param serverResponse - Signature response from server
   * @returns Complete signed attestation data for QR encoding (without embedded public key)
   */
  combineWithServerSignature(
    clientPackage: AttestationPackage,
    serverResponse: SigningResponse,
  ): AttestationData {
    const provider = providers.find((p: Provider) => p.id === clientPackage.identity.provider)
    
    if (!provider) {
      throw new Error(`Unknown provider: ${clientPackage.identity.provider}`)
    }

    return {
      h: {
        c: clientPackage.hashes.cryptographic,
        p: {
          p: clientPackage.hashes.pHash,
          d: clientPackage.hashes.dHash,
        },
      },
      t: serverResponse.timestamp, // Use server timestamp
      i: {
        p: provider.compactId,
        id: clientPackage.identity.identifier,
      },
      s: {
        n: 'sc', // seal.codes shortened
        k: serverResponse.publicKeyId, // Use server public key ID
      },
      // Only include exclusion zone if it exists (images only)
      ...(clientPackage.exclusionZone && {
        e: {
          x: clientPackage.exclusionZone.x,
          y: clientPackage.exclusionZone.y,
          w: clientPackage.exclusionZone.width,
          h: clientPackage.exclusionZone.height,
          f: clientPackage.exclusionZone.fillColor.replace('#', ''), // Remove # for compactness
        },
      }),
      // Add signature for verification (but no public key - save space)
      sig: serverResponse.signature,
      ...(clientPackage.userUrl && { u: clientPackage.userUrl }),
    }
  }

  /**
   * Extract exclusion zone from compact attestation data
   * 
   * @param attestationData - Compact attestation data
   * @returns Exclusion zone configuration or null if not present
   */
  extractExclusionZone(attestationData: AttestationData): QRCodeExclusionZone | null {
    if (!attestationData.e) {
      return null // No exclusion zone (PDF document)
    }
    
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
    
    // Validate hash type-specific fields
    if ('compositePerceptual' in input.documentHashes) {
      // PDF validation
      if (!input.documentHashes.compositePerceptual) {
        throw new Error('Composite perceptual hash is required for PDFs')
      }
    } else {
      // Image validation
      if (!input.documentHashes.pHash) {
        throw new Error('pHash is required for images')
      }
      
      if (!input.documentHashes.dHash) {
        throw new Error('dHash is required for images')
      }
      
      // Exclusion zone is required for images
      if (!input.exclusionZone) {
        throw new Error('Exclusion zone is required for images')
      }
    }
    
    if (!input.identity.identifier) {
      throw new Error('User identifier is required')
    }
    
    if (!input.serviceInfo.publicKeyId) {
      throw new Error('Public key ID is required')
    }

    // Validate exclusion zone if provided
    if (input.exclusionZone) {
      if (input.exclusionZone.x < 0 || input.exclusionZone.y < 0) {
        throw new Error('Exclusion zone position must be non-negative')
      }

      if (input.exclusionZone.width <= 0 || input.exclusionZone.height <= 0) {
        throw new Error('Exclusion zone dimensions must be positive')
      }
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