/**
 * Signing service for seal.codes
 * Handles server-side cryptographic signing of attestation packages
 */

import { authService } from './auth-service'

export interface AttestationPackage {
  hashes: {
    cryptographic: string;
    pHash: string;
    dHash: string;
  };
  identity: {
    provider: string;
    identifier: string;
  };
  exclusionZone: {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor: string;
  };
  userUrl?: string;
}

export interface SigningResponse {
  timestamp: string;
  signature: string;
  publicKey: string;
  publicKeyId: string;
}

export interface SignedAttestationPackage extends AttestationPackage {
  timestamp: string;
  serviceInfo: {
    publicKeyId: string;
  };
  signature: string;
  publicKey: string;
}

/**
 * Signing service class
 */
export class SigningService {
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
   * Sign an attestation package using the server's private key
   * 
   * @param attestationPackage - The attestation package to sign
   * @returns Promise resolving to signing response
   */
  async signAttestation(attestationPackage: AttestationPackage): Promise<SigningResponse> {
    try {
      console.log('🔐 Sending attestation package for signing...')
      
      // Get the current access token
      const accessToken = await authService.getAccessToken()
      if (!accessToken) {
        throw new Error('No authentication token available. Please sign in.')
      }

      // Send the attestation package to the Edge Function
      const response = await fetch(`${this.baseUrl}/sign-attestation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(attestationPackage),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Server error: ${response.status} ${response.statusText}`
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.')
        } else if (response.status === 403) {
          throw new Error('Authorization failed. The attestation package identity does not match your account.')
        } else {
          throw new Error(errorMessage)
        }
      }

      const signingResponse: SigningResponse = await response.json()
      
      console.log('✅ Attestation package signed successfully')
      console.log('📋 Signing response:', {
        timestamp: signingResponse.timestamp,
        publicKeyId: signingResponse.publicKeyId,
        signatureLength: signingResponse.signature.length,
        publicKeyLength: signingResponse.publicKey.length,
      })

      return signingResponse
    } catch (error) {
      console.error('❌ Error signing attestation package:', error)
      throw error
    }
  }

  /**
   * Combine client attestation package with server signature
   * 
   * @param clientPackage - Original attestation package from client
   * @param serverResponse - Signature response from server
   * @returns Complete signed attestation package
   */
  combineWithServerSignature(
    clientPackage: AttestationPackage,
    serverResponse: SigningResponse
  ): SignedAttestationPackage {
    console.log('🔗 Combining client package with server signature...')
    
    const signedPackage: SignedAttestationPackage = {
      ...clientPackage,
      timestamp: serverResponse.timestamp,
      serviceInfo: {
        publicKeyId: serverResponse.publicKeyId,
      },
      signature: serverResponse.signature,
      publicKey: serverResponse.publicKey,
    }

    console.log('✅ Signed attestation package created')
    return signedPackage
  }

  /**
   * Verify that the signing service is available
   * 
   * @returns Promise resolving to true if service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to make a simple request to check if the service is available
      const response = await fetch(`${this.baseUrl}/sign-attestation`, {
        method: 'OPTIONS',
      })
      
      return response.ok
    } catch (error) {
      console.warn('Signing service health check failed:', error)
      return false
    }
  }
}

/**
 * Default signing service instance
 */
export const signingService = new SigningService()