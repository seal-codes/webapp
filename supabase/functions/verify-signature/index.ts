import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AttestationData {
  h: {
    c: string;
    p: {
      p: string;
      d: string;
    };
  };
  t: string;
  i: {
    p: string;
    id: string;
  };
  s: {
    n: string;
    k: string;
  };
  e: {
    x: number;
    y: number;
    w: number;
    h: number;
    f: string;
  };
  sig?: string;
  u?: string;
}

interface SignatureVerificationResult {
  isValid: boolean;
  publicKeyId: string;
  timestamp: string;
  identity: {
    provider: string;
    identifier: string;
  };
  error?: string;
  details?: {
    keyFound: boolean;
    signatureMatch: boolean;
    timestampValid: boolean;
  };
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
    const { attestationData }: { attestationData: AttestationData } = await req.json()

    console.log('🔐 Starting signature verification for key:', attestationData.s.k)
    console.log('📋 RAW ATTESTATION DATA RECEIVED:', JSON.stringify(attestationData))
    console.log('📋 Identity:', attestationData.i)
    console.log('📋 Service info:', attestationData.s)
    console.log('📋 Exclusion zone:', attestationData.e)
    console.log('📋 Signature present:', !!attestationData.sig)
    console.log('📋 Signature length:', attestationData.sig?.length || 0)
    console.log('📋 TIMESTAMP RECEIVED:', attestationData.t)
    console.log('📋 TIMESTAMP TYPE:', typeof attestationData.t)

    // Validate required fields
    if (!attestationData.sig) {
      return Response.json({
        isValid: false,
        publicKeyId: attestationData.s.k,
        timestamp: attestationData.t,
        identity: {
          provider: attestationData.i.p,
          identifier: attestationData.i.id,
        },
        error: 'No signature found in attestation data',
      } as SignatureVerificationResult, {
        headers: corsHeaders,
      })
    }

    if (!attestationData.s.k) {
      return Response.json({
        isValid: false,
        publicKeyId: '',
        timestamp: attestationData.t,
        identity: {
          provider: attestationData.i.p,
          identifier: attestationData.i.id,
        },
        error: 'No public key ID found in attestation data',
      } as SignatureVerificationResult, {
        headers: corsHeaders,
      })
    }

    // Fetch the public key from the database using service role
    console.log('📋 Fetching public key for ID:', attestationData.s.k)
    
    const { data: keyData, error: keyError } = await supabase
      .from('signing_keys')
      .select('public_key, algorithm, created_at, expires_at')
      .eq('id', attestationData.s.k)
      .single()

    if (keyError) {
      console.error('❌ Database error fetching key:', keyError)
      return Response.json({
        isValid: false,
        publicKeyId: attestationData.s.k,
        timestamp: attestationData.t,
        identity: {
          provider: attestationData.i.p,
          identifier: attestationData.i.id,
        },
        error: `Database error: ${keyError.message}`,
        details: {
          keyFound: false,
          signatureMatch: false,
          timestampValid: false,
        },
      } as SignatureVerificationResult, {
        headers: corsHeaders,
      })
    }

    if (!keyData) {
      console.error('❌ Public key not found:', attestationData.s.k)
      return Response.json({
        isValid: false,
        publicKeyId: attestationData.s.k,
        timestamp: attestationData.t,
        identity: {
          provider: attestationData.i.p,
          identifier: attestationData.i.id,
        },
        error: `Public key not found: ${attestationData.s.k}`,
        details: {
          keyFound: false,
          signatureMatch: false,
          timestampValid: false,
        },
      } as SignatureVerificationResult, {
        headers: corsHeaders,
      })
    }

    console.log('✅ Found public key for verification')

    // Check if key was valid at the time of signing
    const signingTime = new Date(attestationData.t)
    const keyCreated = new Date(keyData.created_at)
    const keyExpires = keyData.expires_at ? new Date(keyData.expires_at) : null

    const timestampValid = signingTime >= keyCreated && (!keyExpires || signingTime <= keyExpires)

    if (!timestampValid) {
      console.error('❌ Key was not valid at signing time')
      return Response.json({
        isValid: false,
        publicKeyId: attestationData.s.k,
        timestamp: attestationData.t,
        identity: {
          provider: attestationData.i.p,
          identifier: attestationData.i.id,
        },
        error: 'Key was not valid at the time of signing',
        details: {
          keyFound: true,
          signatureMatch: false,
          timestampValid: false,
        },
      } as SignatureVerificationResult, {
        headers: corsHeaders,
      })
    }

    // Verify the signature
    console.log('🔐 Verifying signature...')

    try {
      // Create the data that was signed (attestation without signature)
      const dataToVerify = {
        h: attestationData.h,
        t: attestationData.t,
        i: attestationData.i,
        s: attestationData.s,
        e: attestationData.e,
        ...(attestationData.u && { u: attestationData.u }),
      }

      console.log('📋 DATA TO VERIFY (without signature):', JSON.stringify(dataToVerify))

      // Convert to canonical JSON string for verification
      const dataString = JSON.stringify(dataToVerify)
      const dataBytes = new TextEncoder().encode(dataString)

      console.log('📋 DATA STRING FOR VERIFICATION:', dataString)
      console.log('📋 DATA STRING LENGTH:', dataString.length)

      // Import the public key
      const publicKeyPem = keyData.public_key
      const publicKeyDer = pemToArrayBuffer(publicKeyPem)
      
      console.log('📋 PUBLIC KEY PEM:', publicKeyPem)
      console.log('📋 PUBLIC KEY DER LENGTH:', publicKeyDer.byteLength)
      
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyDer,
        {
          name: 'Ed25519',
        },
        false,
        ['verify']
      )

      // Decode the signature from base64
      const signatureBytes = base64ToArrayBuffer(attestationData.sig)
      
      console.log('📋 SIGNATURE BASE64:', attestationData.sig)
      console.log('📋 SIGNATURE BYTES LENGTH:', signatureBytes.byteLength)

      // Verify the signature
      const isSignatureValid = await crypto.subtle.verify(
        'Ed25519',
        publicKey,
        signatureBytes,
        dataBytes
      )

      console.log('📋 Signature verification result:', isSignatureValid)
      console.log('📋 VERIFICATION SUMMARY:')
      console.log('  - Key ID:', attestationData.s.k)
      console.log('  - Provider:', attestationData.i.p)
      console.log('  - Service name:', attestationData.s.n)
      console.log('  - Fill color:', attestationData.e.f)
      console.log('  - Data string length:', dataString.length)
      console.log('  - Signature length:', signatureBytes.byteLength)
      console.log('  - Verification result:', isSignatureValid)

      return Response.json({
        isValid: isSignatureValid,
        publicKeyId: attestationData.s.k,
        timestamp: attestationData.t,
        identity: {
          provider: attestationData.i.p,
          identifier: attestationData.i.id,
        },
        details: {
          keyFound: true,
          signatureMatch: isSignatureValid,
          timestampValid: true,
        },
      } as SignatureVerificationResult, {
        headers: corsHeaders,
      })

    } catch (cryptoError) {
      console.error('❌ Cryptographic verification error:', cryptoError)
      return Response.json({
        isValid: false,
        publicKeyId: attestationData.s.k,
        timestamp: attestationData.t,
        identity: {
          provider: attestationData.i.p,
          identifier: attestationData.i.id,
        },
        error: `Signature verification failed: ${cryptoError.message}`,
        details: {
          keyFound: true,
          signatureMatch: false,
          timestampValid: true,
        },
      } as SignatureVerificationResult, {
        headers: corsHeaders,
      })
    }

  } catch (error) {
    console.error('❌ Verification function error:', error)
    
    return Response.json({
      error: `Verification failed: ${error.message}`,
    }, {
      status: 500,
      headers: corsHeaders,
    })
  }
})

// Helper function to convert PEM to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
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