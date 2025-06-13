# Database-Based Key Management Setup

## Overview

The signing service now uses a database table (`signing_keys`) to store and manage cryptographic keys instead of environment variables. This provides better security, key rotation capabilities, and audit trails.

## Database Schema

The `signing_keys` table contains:
- `id`: Unique key identifier
- `private_key`: Ed25519 private key in PEM format
- `public_key`: Corresponding public key in PEM format
- `algorithm`: Key algorithm (Ed25519)
- `is_active`: Whether the key is currently active
- `created_at`: Key creation timestamp
- `expires_at`: Optional expiration date
- `key_purpose`: Purpose of the key (attestation, verification, etc.)
- `metadata`: Additional key information

## Security Features

1. **Row Level Security (RLS)**: Enabled on the table with NO public policies
2. **Service Role Only**: Only the Edge Function can access keys using the service role
3. **Function-Based Access**: Keys are retrieved via a secure database function
4. **Key Rotation**: Built-in support for key rotation

## Setup Steps

### 1. Run the Migration

The migration file `20250113_create_signing_keys.sql` will:
- Create the `signing_keys` table
- Set up security policies
- Insert a test key for MVP development
- Create helper functions for key management

```bash
# Apply the migration
supabase db push
```

### 2. Verify the Setup

Check that the table was created and the test key was inserted:

```sql
-- Check the table structure
\d signing_keys

-- Verify the test key exists
SELECT id, algorithm, is_active, key_purpose, created_at 
FROM signing_keys 
WHERE is_active = true;
```

### 3. Test the Edge Function

The Edge Function should now work with the database-stored keys:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/sign-attestation' \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'Content-Type: application/json' \
  -d '{"hashes":{"cryptographic":"test","pHash":"test","dHash":"test"},"identity":{"provider":"github","identifier":"test@example.com"},"exclusionZone":{"x":0,"y":0,"width":100,"height":100,"fillColor":"#FFFFFF"}}'
```

## For Production

### Generate Real Keys

Use the provided script to generate production-ready Ed25519 keys:

```bash
node scripts/generate-signing-keys.js
```

This will output:
- Private key in PEM format
- Public key in PEM format  
- SQL statement to insert the key into the database

### Insert Production Keys

1. **Deactivate test keys**:
   ```sql
   UPDATE signing_keys SET is_active = false WHERE id = 'mvp-test-key-2024';
   ```

2. **Insert production key** (use the SQL from the key generation script)

3. **Verify the new key is active**:
   ```sql
   SELECT id, algorithm, is_active, key_purpose 
   FROM signing_keys 
   WHERE is_active = true;
   ```

## Key Rotation

To rotate keys (recommended every 6-12 months):

```sql
-- Use the built-in rotation function
SELECT rotate_signing_key(
  'new-key-id-2025',
  '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
  '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----',
  'attestation'
);
```

This will:
- Deactivate all current active keys
- Insert the new key as active
- Maintain audit trail of old keys

## Security Best Practices

1. **Access Control**: Only the Edge Function service role can access keys
2. **Key Rotation**: Rotate keys regularly using the provided function
3. **Audit Trail**: Keep old keys for verification of historical signatures
4. **Monitoring**: Monitor key usage and access patterns
5. **Backup**: Securely backup key data for disaster recovery

## Troubleshooting

### Edge Function Can't Access Keys

Check that:
1. The migration was applied successfully
2. The `SUPABASE_SERVICE_ROLE_KEY` environment variable is set
3. The service role has the necessary permissions

### No Active Keys Found

Verify that there's an active key:
```sql
SELECT * FROM signing_keys WHERE is_active = true;
```

If no active keys exist, insert one using the key generation script.

### Key Format Errors

Ensure keys are in proper PEM format with correct headers:
- Private key: `-----BEGIN PRIVATE KEY-----` ... `-----END PRIVATE KEY-----`
- Public key: `-----BEGIN PUBLIC KEY-----` ... `-----END PUBLIC KEY-----`