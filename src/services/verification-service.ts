/**
 * Document verification service
 * Handles QR code data encoding/decoding and document integrity verification with ultra-compact encoding
 */

import { encode, decode } from 'cbor-x'
import { documentHashService } from './document-hash-service'
import { attestationBuilder } from './attestation-builder'
import { qrScanService } from './qr-scan-service'
import type { AttestationData, QRCodeExclusionZone } from '@/types/qrcode'

export type VerificationStatus = 
  | 'verified_exact'           // Exact cryptographic match
  | 'verified_visual'          // Visual content matches (compressed)
  | 'modified'                 // Document has been modified
  | 'error_hash_mismatch'      // Hash doesn't match
  | 'error_invalid_format'     // Invalid document format
  | 'error_processing'         // Error during processing

/**
 * Verification result for document integrity check
 */
export interface VerificationResult {
  /** Whether the document integrity is verified */
  isValid: boolean;
  /** Detailed verification status */
  status: VerificationStatus;
  /** Detailed comparison results */
  details: {
    cryptographicMatch: boolean;
    perceptualMatch: boolean;
    documentType: string;
  };
}

/**
 * Decoded verification data from QR code
 */
export interface DecodedVerificationData {
  /** The original attestation data */
  attestationData: AttestationData;
  /** Whether decoding was successful */
  isValid: boolean;
  /** Error code if decoding failed */
  errorCode?: 'invalid_format' | 'decode_failed' | 'invalid_structure';
}

/**
 * Helper function to extract exclusion zone from decoded verification data
 */
export function getExclusionZone(decodedData: DecodedVerificationData | null): QRCodeExclusionZone | undefined {
  if (!decodedData?.attestationData?.e) return undefined
  
  const e = decodedData.attestationData.e
  return {
    x: e.x,
    y: e.y,
    width: e.w,
    height: e.h,
    fillColor: `#${e.f}`
  }
}

/**
 * Ultra-compact data structure for QR encoding
 * Uses minimal field names and optimized data types
 */
interface UltraCompactData {
  /** Document hashes (cryptographic and perceptual) */
  h: {
    /** Cryptographic hash (SHA-256) */
    c: string;
    /** Perceptual hash (pHash) */
    p: string;
    /** Difference hash (dHash) */
    d: string;
  };
  /** Unix timestamp */
  t: number;
  /** Identity (provider:user) */
  i: string;
  /** Service key */
  s: string;
  /** Exclusion zone [x,y,w,h] (optional) */
  e?: number[];
  /** User URL (optional) */
  u?: string;
}

/**
 * Service for handling document verification with ultra-compact encoding
 */
export class VerificationService {
  /**
   * Scan an image file for QR codes
   * 
   * @param imageFile - The image file to scan
   * @param exclusionZone - Optional exclusion zone to focus scanning
   * @returns Promise resolving to scan result
   */
  async scanImageForQR(imageFile: File, exclusionZone?: { x: number; y: number; width: number; height: number }) {
    return qrScanService.scanImageForQR(imageFile, exclusionZone)
  }

  /**
   * Verify document integrity against attestation data
   * 
   * @param document - The document file to verify
   * @param attestationData - The attestation data from QR code
   * @returns Promise resolving to verification result
   */
  async verifyDocument(document: File, attestationData: AttestationData): Promise<VerificationResult> {
    return this.verifyDocumentIntegrity(document, attestationData)
  }

  /**
   * Encode attestation data for QR code URL with maximum compression
   * 
   * @param attestationData - The attestation data to encode
   * @returns URL-safe encoded string
   */
  encodeForQR(attestationData: AttestationData): string {
    try {
      // Create ultra-compact version
      const compactData = this.createUltraCompactData(attestationData)
      
      console.log('📦 Original attestation data size:', JSON.stringify(attestationData).length, 'chars')
      console.log('📦 Compact data size:', JSON.stringify(compactData).length, 'chars')
      
      // Encode to CBOR binary format (most efficient)
      const cborData = encode(compactData)
      console.log('📦 CBOR data size:', cborData.length, 'bytes')
      
      // Convert to base64url (URL-safe base64)
      const base64 = btoa(String.fromCharCode(...new Uint8Array(cborData)))
      const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      
      console.log('📦 Final encoded size:', base64url.length, 'characters')
      console.log('📦 Compression ratio:', Math.round((1 - base64url.length / JSON.stringify(attestationData).length) * 100), '%')
      
      return base64url
    } catch (error) {
      console.error('Failed to encode attestation data:', error)
      throw new Error('Failed to encode verification data')
    }
  }

  /**
   * Create ultra-compact version of attestation data
   * Optimizes for minimal QR code size while preserving essential information
   * 
   * @param attestationData - Original attestation data
   * @returns Ultra-compact version
   */
  private createUltraCompactData(attestationData: AttestationData): UltraCompactData {
    // Create minimal version with aggressive compression
    const compact: UltraCompactData = {
      // Include both cryptographic and perceptual hashes
      h: {
        c: attestationData.h.c,    // Cryptographic hash
        p: attestationData.h.p.p,  // Perceptual hash
        d: attestationData.h.p.d,  // Difference hash
      },
      
      // Timestamp: Convert to Unix timestamp (saves ~15 characters vs ISO string)
      t: Math.floor(new Date(attestationData.t).getTime() / 1000),
      
      // Identity: Combine provider and user with separator (saves field overhead)
      i: attestationData.i.p + ':' + attestationData.i.id.substring(0, 15), // Limit user ID length
      
      // Service: Use only essential part of key
      s: attestationData.s.k.substring(0, 6),
    }

    // Only include exclusion zone if it's not at default position (0,0,100,100)
    if (attestationData.e && 
        !(attestationData.e.x === 0 && attestationData.e.y === 0 && 
          attestationData.e.w === 100 && attestationData.e.h === 100)) {
      // Use array format to save space vs object
      compact.e = [
        Math.round(attestationData.e.x),
        Math.round(attestationData.e.y), 
        Math.round(attestationData.e.w),
        Math.round(attestationData.e.h)
      ]
    }

    // Only include user URL if present and limit length
    if (attestationData.u) {
      compact.u = attestationData.u.substring(0, 25) // Limit URL length
    }

    return compact
  }

  /**
   * Expand ultra-compact data back to full attestation data
   * 
   * @param compactData - Ultra-compact data
   * @returns Full attestation data
   */
  private expandCompactData(compactData: UltraCompactData): AttestationData {
    // Parse identity string
    const identityParts = compactData.i.split(':')
    const provider = identityParts[0] || 'unknown'
    const userId = identityParts[1] || 'unknown'
    
    // Reconstruct full attestation data
    const expanded: AttestationData = {
      h: {
        c: compactData.h.c,
        p: {
          p: compactData.h.p,
          d: compactData.h.d,
        },
      },
      t: new Date(compactData.t * 1000).toISOString(),
      i: {
        p: provider,
        id: userId,
      },
      s: {
        n: 'sc',
        k: compactData.s,
      },
      e: {
        x: compactData.e ? compactData.e[0] : 0,
        y: compactData.e ? compactData.e[1] : 0,
        w: compactData.e ? compactData.e[2] : 100,
        h: compactData.e ? compactData.e[3] : 100,
        f: 'FFFFFF', // Default white fill
      },
    }

    // Add user URL if present
    if (compactData.u) {
      expanded.u = compactData.u
    }

    return expanded
  }

  /**
   * Decode attestation data from QR code URL parameter
   * 
   * @param encodedData - URL-safe encoded string from QR code
   * @returns Decoded attestation data or error information
   */
  decodeFromQR(encodedData: string): DecodedVerificationData {
    try {
      console.log('🔍 Decoding data of length:', encodedData.length)
      
      // Add padding if needed and convert back from base64url
      let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) {
        base64 += '='
      }
      
      // Convert from base64 to binary
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Decode from CBOR
      const compactData = decode(bytes) as UltraCompactData
      console.log('📦 Decoded compact data:', compactData)
      
      // Expand to full attestation data
      const attestationData = this.expandCompactData(compactData)
      console.log('📦 Expanded attestation data:', attestationData)
      
      // Validate the structure
      if (!this.validateAttestationStructure(attestationData)) {
        return {
          attestationData: {} as AttestationData,
          isValid: false,
          errorCode: 'invalid_structure'
        }
      }
      
      return {
        attestationData,
        isValid: true
      }
    } catch (error) {
      console.error('Failed to decode verification data:', error)
      return {
        attestationData: {} as AttestationData,
        isValid: false,
        errorCode: 'decode_failed'
      }
    }
  }

  /**
   * Generate verification URL for QR code
   * 
   * @param attestationData - The attestation data
   * @param baseUrl - Base URL of the application
   * @returns Complete verification URL
   */
  generateVerificationUrl(attestationData: AttestationData, baseUrl: string): string {
    const encodedData = this.encodeForQR(attestationData)
    const url = `${baseUrl}/v/${encodedData}`
    
    console.log('🔗 Generated verification URL length:', url.length)
    
    return url
  }

  /**
   * Verify document integrity against attestation data
   * 
   * @param document - The document file to verify
   * @param attestationData - The attestation data from QR code
   * @returns Promise resolving to verification result
   */
  async verifyDocumentIntegrity(
    document: File, 
    attestationData: AttestationData
  ): Promise<VerificationResult> {
    try {
      // Extract exclusion zone from attestation data
      const exclusionZone = attestationBuilder.extractExclusionZone(attestationData)
      
      // Calculate hashes for the uploaded document with exclusion zone
      const calculatedHashes = await documentHashService.calculateDocumentHashes(
        document,
        exclusionZone
      )
      
      // Compare cryptographic hash
      const storedHash = attestationData.h.c
      const calculatedHash = calculatedHashes.cryptographic
      
      const cryptographicMatch = calculatedHash === storedHash
      
      // Compare perceptual hashes (with some tolerance for compression)
      const pHashMatch = this.comparePerceptualHashes(
        calculatedHashes.pHash, 
        attestationData.h.p.p
      )
      const dHashMatch = this.comparePerceptualHashes(
        calculatedHashes.dHash, 
        attestationData.h.p.d
      )
      const perceptualMatch = pHashMatch || dHashMatch
      
      // Determine verification result
      let status: VerificationStatus
      let isValid: boolean
      
      if (cryptographicMatch) {
        isValid = true
        status = 'verified_exact'
      } else if (perceptualMatch) {
        isValid = true
        status = 'verified_visual'
      } else {
        isValid = false
        status = 'modified'
      }
      
      return {
        isValid,
        status,
        details: {
          cryptographicMatch,
          perceptualMatch,
          documentType: document.type
        }
      }
    } catch (error) {
      console.error('Error verifying document:', error)
      return {
        isValid: false,
        status: 'error_processing',
        details: {
          cryptographicMatch: false,
          perceptualMatch: false,
          documentType: document.type
        }
      }
    }
  }

  /**
   * Compare perceptual hashes using Hamming distance
   * 
   * @param hash1 - First hash
   * @param hash2 - Second hash
   * @returns Whether hashes are similar enough
   */
  private comparePerceptualHashes(hash1: string, hash2: string): boolean {
    // If either hash is empty, return false
    if (!hash1 || !hash2) return false
    
    // Calculate Hamming distance (number of differing bits)
    let distance = 0
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++
      }
    }
    
    // Calculate similarity percentage
    const similarity = 1 - (distance / hash1.length)
    
    // Consider hashes similar if they match at least 90%
    return similarity >= 0.9
  }

  /**
   * Validate attestation data structure
   * 
   * @param data - Data to validate
   * @returns Whether the structure is valid
   */
  private validateAttestationStructure(data: any): data is AttestationData {
    return (
      data &&
      typeof data === 'object' &&
      data.h &&
      typeof data.h.c === 'string' &&
      data.h.p &&
      typeof data.h.p.p === 'string' &&
      typeof data.h.p.d === 'string' &&
      typeof data.t === 'string' &&
      data.i &&
      typeof data.i.p === 'string' &&
      typeof data.i.id === 'string' &&
      data.s &&
      typeof data.s.n === 'string' &&
      typeof data.s.k === 'string' &&
      data.e &&
      typeof data.e.x === 'number' &&
      typeof data.e.y === 'number' &&
      typeof data.e.w === 'number' &&
      typeof data.e.h === 'number' &&
      typeof data.e.f === 'string'
    )
  }

  /**
   * Get encoding statistics for optimization analysis
   * 
   * @param attestationData - Attestation data to analyze
   * @returns Encoding statistics
   */
  getEncodingStats(attestationData: AttestationData): {
    originalSize: number;
    compactSize: number;
    cborSize: number;
    finalSize: number;
    compressionRatio: number;
    recommendations: string[];
  } {
    const originalJson = JSON.stringify(attestationData)
    const compactData = this.createUltraCompactData(attestationData)
    const compactJson = JSON.stringify(compactData)
    const cborData = encode(compactData)
    const finalEncoded = this.encodeForQR(attestationData)
    
    const compressionRatio = (1 - finalEncoded.length / originalJson.length) * 100
    
    const recommendations: string[] = []
    
    if (finalEncoded.length > 100) {
      recommendations.push('Consider shorter user identifiers')
    }
    
    if (attestationData.u && attestationData.u.length > 20) {
      recommendations.push('User URL is long - consider shortening or removing')
    }
    
    if (compressionRatio < 50) {
      recommendations.push('Low compression ratio - review data structure')
    }
    
    return {
      originalSize: originalJson.length,
      compactSize: compactJson.length,
      cborSize: cborData.length,
      finalSize: finalEncoded.length,
      compressionRatio,
      recommendations
    }
  }
}

/**
 * Default verification service instance
 */
export const verificationService = new VerificationService()
