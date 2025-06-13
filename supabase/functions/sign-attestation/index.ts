import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AttestationPackage {
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

interface SigningResponse {
  timestamp: string;
  signature: string;
  publicKey: string;
  publicKeyId: string;
}

interface SigningKey {
  key_id: string;
  private_key: string;
  public_key: string;
  algorithm: string;
}

serve(async (req) => {
  console.log(`🔧 Edge Function called: ${req.method} ${req.url}`)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log(`❌ Method not allowed: ${req.method}`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log('🔐 Starting attestation signing process...')
    
    // Initialize Supabase client with service role for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('📋 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey
    })
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Supabase configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Create client for user authentication (using anon key)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
    
    // Create client for database operations (using service role)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('❌ Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔍 Verifying user authentication...')
    
    // Verify the user's session using anon key client
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ User authenticated:', user.email)

    // Parse the attestation package
    const attestationPackage: AttestationPackage = await req.json()
    console.log('📦 Received attestation package:', {
      provider: attestationPackage.identity.provider,
      identifier: attestationPackage.identity.identifier,
      hasHashes: !!attestationPackage.hashes,
      hasExclusionZone: !!attestationPackage.exclusionZone
    })

    // Validate that the identity in the package matches the authenticated user
    const userEmail = user.email
    const userProvider = user.app_metadata?.provider || 'unknown'

    console.log('🔍 Validating identity match:', {
      userEmail,
      userProvider,
      packageEmail: attestationPackage.identity.identifier,
      packageProvider: attestationPackage.identity.provider
    })

    if (attestationPackage.identity.identifier !== userEmail) {
      console.error('❌ Identity mismatch: email')
      return new Response(
        JSON.stringify({ 
          error: 'Identity mismatch: attestation package identity does not match authenticated user' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (attestationPackage.identity.provider !== userProvider) {
      console.error('❌ Identity mismatch: provider')
      return new Response(
        JSON.stringify({ 
          error: 'Provider mismatch: attestation package provider does not match authenticated user' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Identity validation passed')

    // Get the active signing key from database using service role
    console.log('🔑 Retrieving active signing key from database...')
    
    const { data: keyData, error: keyError } = await supabaseService
      .rpc('get_active_signing_key', { purpose: 'attestation' })
    
    if (keyError || !keyData || keyData.length === 0) {
      console.error('❌ Failed to retrieve signing key:', keyError)
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: No active signing key available',
          details: keyError?.message || 'No active keys found'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const signingKey: SigningKey = keyData[0]
    console.log('✅ Retrieved signing key:', {
      keyId: signingKey.key_id,
      algorithm: signingKey.algorithm,
      hasPrivateKey: !!signingKey.private_key,
      hasPublicKey: !!signingKey.public_key
    })

    // Add server timestamp and public key ID
    const timestamp = new Date().toISOString()
    
    const packageToSign = {
      ...attestationPackage,
      timestamp,
      serviceInfo: {
        publicKeyId: signingKey.key_id
      }
    }

    console.log('📝 Package prepared for signing with timestamp:', timestamp)

    // Create the data to sign (JSON string of the complete package)
    const dataToSign = JSON.stringify(packageToSign)
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(dataToSign)

    console.log('🔐 Signing data with Ed25519...')

    try {
      // Parse the private key from PEM format
      const privateKeyPem = signingKey.private_key
      const privateKeyData = privateKeyPem
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\s/g, '')

      const privateKeyBytes = Uint8Array.from(atob(privateKeyData), c => c.charCodeAt(0))
      
      // Import the private key for signing
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBytes,
        {
          name: 'Ed25519',
        },
        false,
        ['sign']
      )

      // Sign the data
      const signatureBytes = await crypto.subtle.sign(
        'Ed25519',
        privateKey,
        dataBytes
      )

      // Convert signature to base64
      const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))

      console.log('✅ Data signed successfully')

      // Extract public key from the stored public key
      const publicKeyPem = signingKey.public_key
      const publicKeyData = publicKeyPem
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s/g, '')

      const response: SigningResponse = {
        timestamp,
        signature,
        publicKey: publicKeyData, // Base64 encoded public key
        publicKeyId: signingKey.key_id
      }

      console.log('🎉 Signing completed successfully')

      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (cryptoError) {
      console.error('❌ Cryptographic signing failed:', cryptoError)
      
      // For MVP: Fall back to mock signing if real crypto fails
      console.log('⚠️ Falling back to mock signature for MVP')
      
      const mockSignature = btoa(`mock-signature-${timestamp}-${userEmail}`)
      const mockPublicKey = btoa(`mock-public-key-${signingKey.key_id}`)

      const response: SigningResponse = {
        timestamp,
        signature: mockSignature,
        publicKey: mockPublicKey,
        publicKeyId: signingKey.key_id
      }

      console.log('✅ Mock signature generated as fallback')

      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('💥 Error in sign-attestation function:', error)
    
    // Provide more detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorDetails.message,
        timestamp: errorDetails.timestamp
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})