import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body
    const attestationPackage: AttestationPackage = await req.json()

    console.log('🔐 Starting attestation signing process...')
    console.log('📋 RAW REQUEST BODY:', JSON.stringify(attestationPackage, null, 2))
    console.log('📋 Identity:', attestationPackage.identity)
    console.log('📋 Exclusion Zone:', attestationPackage.exclusionZone)
    console.log('📋 Hashes:', attestationPackage.hashes)

    // Get the active signing key
    const { data: keyData, error: keyError } = await supabase
      .from('signing_keys')
      .select('id, private_key, public_key, algorithm')
      .eq('is_active', true)
      .eq('key_purpose', 'attestation')
      .single()

    if (keyError) {
      console.error('❌ Database error fetching signing key:', keyError)
      return Response.json({
        error: `Database error: ${keyError.message}`,
      }, {
        status: 500,
        headers: corsHeaders,
      })
    }

    if (!keyData) {
      console.error('❌ No active signing key found')
      return Response.json({
        error: 'No active signing key available',
      }, {
        status: 500,
        headers: corsHeaders,
      })
    }

    console.log('✅ Found active signing key:', keyData.id)

    // Create the attestation data structure for signing
    const timestamp = new Date().toISOString()
    
    // Convert provider to compact ID (same as client does)
    const providers = [
      { id: 'google', compactId: 'g' },
      { id: 'github', compactId: 'gh' },
      { id: 'twitter', compactId: 't' },
      { id: 'facebook', compactId: 'f' },
      { id: 'microsoft', compactId: 'm' },
      { id: 'apple', compactId: 'a' },
      { id: 'linkedin', compactId: 'li' },
      { id: 'tiktok', compactId: 'tk' },
      { id: 'wechat', compactId: 'w' },
      { id: 'alipay', compactId: 'ap' },
      { id: 'paypal', compactId: 'pp' },
      { id: 'line', compactId: 'l' },
    ]
    
    const provider = providers.find(p => p.id === attestationPackage.identity.provider)
    if (!provider) {
      throw new Error(`Unknown provider: ${attestationPackage.identity.provider}`)
    }
    
    // Convert to compact format for signing (same as QR code format)
    const attestationData = {
      h: {
        c: attestationPackage.hashes.cryptographic,
        p: {
          p: attestationPackage.hashes.pHash,
          d: attestationPackage.hashes.dHash,
        },
      },
      t: timestamp,
      i: {
        p: provider.compactId, // Use compact ID, not full ID
        id: attestationPackage.identity.identifier,
      },
      s: {
        n: 'sc', // Use same shortened name as client
        k: keyData.id,
      },
      e: {
        x: attestationPackage.exclusionZone.x,
        y: attestationPackage.exclusionZone.y,
        w: attestationPackage.exclusionZone.width,
        h: attestationPackage.exclusionZone.height,
        f: attestationPackage.exclusionZone.fillColor.replace('#', ''), // Remove # for compactness, same as client
      },
      ...(attestationPackage.userUrl && { u: attestationPackage.userUrl }),
    }

    console.log('📋 ATTESTATION DATA FOR SIGNING:', JSON.stringify(attestationData, null, 2))

    // Convert to canonical JSON string for signing
    const dataString = JSON.stringify(attestationData)
    const dataBytes = new TextEncoder().encode(dataString)

    console.log('🔐 Signing attestation data...')
    console.log('📋 DATA STRING FOR SIGNING:', dataString)
    console.log('📋 DATA STRING LENGTH:', dataString.length)

    try {
      // Import the private key
      const privateKeyPem = keyData.private_key
      const privateKeyDer = pemToArrayBuffer(privateKeyPem)
      
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyDer,
        {
          name: 'Ed25519',
        },
        false,
        ['sign']
      )

      // Sign the data
      const signatureBuffer = await crypto.subtle.sign(
        'Ed25519',
        privateKey,
        dataBytes
      )

      // Convert signature to base64
      const signature = arrayBufferToBase64(signatureBuffer)

      console.log('✅ Attestation signed successfully')

      const signingResponse: SigningResponse = {
        timestamp,
        signature,
        publicKey: keyData.public_key,
        publicKeyId: keyData.id,
      }

      return Response.json(signingResponse, {
        headers: corsHeaders,
      })

    } catch (cryptoError) {
      console.error('❌ Cryptographic signing error:', cryptoError)
      return Response.json({
        error: `Signing failed: ${cryptoError.message}`,
      }, {
        status: 500,
        headers: corsHeaders,
      })
    }

  } catch (error) {
    console.error('❌ Signing function error:', error)
    
    return Response.json({
      error: `Signing failed: ${error.message}`,
    }, {
      status: 500,
      headers: corsHeaders,
    })
  }
})

// Helper function to convert PEM to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '')
  
  return base64ToArrayBuffer(base64)
}

// Helper function to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
