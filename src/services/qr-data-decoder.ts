/**
 * QR Data Decoder Utility
 * Handles decoding of QR code data without circular dependencies
 */

import { decode } from 'cbor-x'
import type { AttestationData } from '@/types/qrcode'

export interface DecodedQRResult {
  isValid: boolean
  attestationData?: AttestationData
  error?: string
}

/**
 * Decode QR code data to extract attestation information
 * This is a standalone utility to avoid circular dependencies
 */
export function decodeQRData(qrData: string): DecodedQRResult {
  try {
    // Check if it's a verification URL
    if (qrData.includes('/v/')) {
      const urlParts = qrData.split('/v/')
      if (urlParts.length === 2) {
        const encodedData = urlParts[1]
        return decodeFromBase64(encodedData)
      }
    }
    
    // Try direct CBOR decoding
    return decodeFromBase64(qrData)
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown decoding error'
    }
  }
}

/**
 * Decode base64-encoded CBOR data
 */
function decodeFromBase64(encodedData: string): DecodedQRResult {
  try {
    // Decode base64 to bytes
    const binaryString = atob(encodedData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Decode CBOR
    const decoded = decode(bytes) as AttestationData
    
    // Basic validation
    if (!decoded || typeof decoded !== 'object') {
      return {
        isValid: false,
        error: 'Invalid decoded data structure'
      }
    }

    // Check for required fields
    if (!decoded.documentHash || !decoded.identity || !decoded.timestamp) {
      return {
        isValid: false,
        error: 'Missing required attestation fields'
      }
    }

    return {
      isValid: true,
      attestationData: decoded
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'CBOR decoding failed'
    }
  }
}

/**
 * Extract attestation data from QR code data
 * Standalone function for use in QR reader services
 */
export async function extractAttestationData(qrData: string): Promise<AttestationData | undefined> {
  try {
    const result = decodeQRData(qrData)
    return result.isValid ? result.attestationData : undefined
  } catch (error) {
    console.warn('Failed to extract attestation data:', error)
    return undefined
  }
}
