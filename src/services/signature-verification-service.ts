/**
 * Signature verification service for seal.codes
 * Handles online verification of attestation signatures using server-side public keys
 */

import { authService } from './auth-service'
import type { AttestationData } from '@/types/qrcode'

export interface SignatureVerificationResult {
  /** Whether the signature is valid */
  isValid: boolean;
  /** The public key ID that was used for verification */
  publicKeyId: string;
  /** The timestamp when the attestation was signed */
  timestamp: string;
  /** The identity that was verified at signing time */
  identity: {
    provider: string;
    identifier: string;
  };
  /** Error message if verification failed */
  error?: string;
  /** Categorized error type for better user messaging */
  errorType?: 'signature_mismatch' | 'server_error' | 'missing_data' | 'network_error';
  /** Additional verification details */
  details?: {
    keyFound: boolean;
    signatureMatch: boolean;
    timestampValid: boolean;
  };
  /** Whether document integrity can be verified (even if identity cannot) */
  documentIntegrityVerified?: boolean;
}

/**
 * Service for verifying attestation signatures online
 */
export class SignatureVerificationService {
  private readonly baseUrl: string

  constructor() {
    // Use Supabase Edge Functions URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL environment variable is required')
    }
    this.baseUrl = `${supabaseUrl}/functions/v1`
  }

  /**
   * Verify the signature of an attestation package online
   * 
   * @param attestationData - The attestation data to verify
   * @returns Promise resolving to verification result
   */
  async verifySignature(attestationData: AttestationData): Promise<SignatureVerificationResult> {
    try {
      console.log('🔐 Starting online signature verification...')
      
      // Validate that we have the required data for verification
      if (!attestationData.sig) {
        return {
          isValid: false,
          publicKeyId: attestationData.s.k,
          timestamp: attestationData.t,
          identity: {
            provider: attestationData.i.p,
            identifier: attestationData.i.id,
          },
          error: 'No signature found in attestation data',
          errorType: 'missing_data',
          documentIntegrityVerified: false,
        }
      }

      if (!attestationData.s.k) {
        return {
          isValid: false,
          publicKeyId: '',
          timestamp: attestationData.t,
          identity: {
            provider: attestationData.i.p,
            identifier: attestationData.i.id,
          },
          error: 'No public key ID found in attestation data',
          errorType: 'missing_data',
          documentIntegrityVerified: false,
        }
      }

      console.log('📋 Verification request:', {
        publicKeyId: attestationData.s.k,
        timestamp: attestationData.t,
        hasSignature: !!attestationData.sig,
      })

      // Get access token for authenticated requests (optional - verification can be public)
      const accessToken = await authService.getAccessToken()
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      // Send verification request to Edge Function
      const response = await fetch(`${this.baseUrl}/verify-signature`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          attestationData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Server error: ${response.status} ${response.statusText}`
        
        console.error('❌ Signature verification failed:', errorMessage)
        
        return {
          isValid: false,
          publicKeyId: attestationData.s.k,
          timestamp: attestationData.t,
          identity: {
            provider: attestationData.i.p,
            identifier: attestationData.i.id,
          },
          error: errorMessage,
          errorType: response.status >= 500 ? 'server_error' : 'network_error',
          documentIntegrityVerified: false,
        }
      }

      const verificationResult: SignatureVerificationResult = await response.json()
      
      // Enhance the result with better error categorization
      if (!verificationResult.isValid && verificationResult.details) {
        const { keyFound, signatureMatch, timestampValid } = verificationResult.details
        
        if (keyFound && timestampValid && !signatureMatch) {
          // Document hashes match but signature doesn't - potential identity fraud
          verificationResult.errorType = 'signature_mismatch'
          verificationResult.documentIntegrityVerified = true // Document itself is intact
        } else if (!keyFound || !timestampValid) {
          // Server-side verification issues
          verificationResult.errorType = 'server_error'
          verificationResult.documentIntegrityVerified = false
        }
      }
      
      console.log('✅ Signature verification completed:', {
        isValid: verificationResult.isValid,
        publicKeyId: verificationResult.publicKeyId,
        error: verificationResult.error,
      })

      return verificationResult

    } catch (error) {
      console.error('❌ Error during signature verification:', error)
      
      return {
        isValid: false,
        publicKeyId: attestationData.s?.k || '',
        timestamp: attestationData.t || '',
        identity: {
          provider: attestationData.i?.p || '',
          identifier: attestationData.i?.id || '',
        },
        error: error instanceof Error ? error.message : 'Unknown verification error',
        errorType: 'network_error',
        documentIntegrityVerified: false,
      }
    }
  }

  /**
   * Check if the signature verification service is available
   * 
   * @returns Promise resolving to true if service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/verify-signature`, {
        method: 'OPTIONS',
      })
      
      return response.ok
    } catch (error) {
      console.warn('Signature verification service health check failed:', error)
      return false
    }
  }
}

/**
 * Default signature verification service instance
 */
export const signatureVerificationService = new SignatureVerificationService()