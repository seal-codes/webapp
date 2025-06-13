/**
 * Script to generate Ed25519 key pairs for production use
 * Run with: node scripts/generate-signing-keys.js
 */

import { webcrypto } from 'crypto'

// Use Node.js crypto if available, otherwise use global crypto
const crypto = globalThis.crypto || webcrypto

async function generateEd25519KeyPair() {
  console.log('🔑 Generating Ed25519 key pair...')
  
  try {
    // Generate Ed25519 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'Ed25519',
      },
      true, // extractable
      ['sign', 'verify'],
    )

    // Export private key
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)))
    const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`

    // Export public key
    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`

    console.log('✅ Key pair generated successfully!')
    console.log('\n📋 Copy these values to your database:')
    console.log('\n🔐 Private Key (PEM format):')
    console.log(privateKeyPem)
    console.log('\n🔓 Public Key (PEM format):')
    console.log(publicKeyPem)
    
    console.log('\n📝 SQL to insert into signing_keys table:')
    const keyId = `prod-key-${Date.now()}`
    console.log(`
INSERT INTO signing_keys (
  id,
  private_key,
  public_key,
  algorithm,
  is_active,
  key_purpose,
  metadata
) VALUES (
  '${keyId}',
  '${privateKeyPem}',
  '${publicKeyPem}',
  'Ed25519',
  true,
  'attestation',
  '{"description": "Production signing key", "environment": "production", "generated_at": "${new Date().toISOString()}"}'::jsonb
);`)

    console.log('\n⚠️  SECURITY NOTES:')
    console.log('- Store the private key securely')
    console.log('- Never commit private keys to version control')
    console.log('- Consider using a key management service in production')
    console.log('- Rotate keys regularly')

  } catch (error) {
    console.error('❌ Error generating key pair:', error)
  }
}

// Run the key generation
generateEd25519KeyPair()