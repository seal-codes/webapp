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
  /** Additional verification details */
  details?: {
    keyFound: boolean;
    signatureMatch: boolean;
    timestampValid: boolean;
  };
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
        }
      }

      const verificationResult: SignatureVerificationResult = await response.json()
      
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