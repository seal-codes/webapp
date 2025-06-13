/*
  # Create signing keys table for attestation service

  1. New Tables
    - `signing_keys`
      - `id` (text, primary key) - Key identifier
      - `private_key` (text) - Ed25519 private key in PEM format
      - `public_key` (text) - Corresponding public key in PEM format
      - `algorithm` (text) - Key algorithm (Ed25519)
      - `is_active` (boolean) - Whether this key is currently active
      - `created_at` (timestamptz) - When the key was created
      - `expires_at` (timestamptz) - When the key expires (optional)
      - `key_purpose` (text) - Purpose of the key (attestation, verification, etc.)

  2. Security
    - Enable RLS on `signing_keys` table
    - NO public policies - only accessible via service role
    - Add function to get active signing key (service role only)

  3. Initial Data
    - Insert a test key for MVP development
*/

-- Create the signing keys table
CREATE TABLE IF NOT EXISTS signing_keys (
  id text PRIMARY KEY,
  private_key text NOT NULL,
  public_key text NOT NULL,
  algorithm text NOT NULL DEFAULT 'Ed25519',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  key_purpose text NOT NULL DEFAULT 'attestation',
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS (Row Level Security)
ALTER TABLE signing_keys ENABLE ROW LEVEL SECURITY;

-- NO public policies - this table should only be accessible via service role
-- The Edge Function will use the service role to access keys

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_signing_keys_active 
ON signing_keys (is_active, key_purpose, created_at DESC) 
WHERE is_active = true;

-- Create function to get the current active signing key
-- This function can only be called with service role privileges
CREATE OR REPLACE FUNCTION get_active_signing_key(purpose text DEFAULT 'attestation')
RETURNS TABLE (
  key_id text,
  private_key text,
  public_key text,
  algorithm text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sk.id,
    sk.private_key,
    sk.public_key,
    sk.algorithm
  FROM signing_keys sk
  WHERE sk.is_active = true 
    AND sk.key_purpose = purpose
    AND (sk.expires_at IS NULL OR sk.expires_at > now())
  ORDER BY sk.created_at DESC
  LIMIT 1;
END;
$$;

-- Insert a test key for MVP development
-- In production, this should be replaced with a real Ed25519 key
INSERT INTO signing_keys (
  id,
  private_key,
  public_key,
  algorithm,
  is_active,
  key_purpose,
  metadata
) VALUES (
  'mvp-test-key-2024',
  '-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIGVzZWFsLWNvZGVzLW12cC10ZXN0LWtleS0yMDI0LXRlc3Q=
-----END PRIVATE KEY-----',
  '-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAc2VhbC1jb2Rlcy1tdnAtdGVzdC1rZXktMjAyNC10ZXN0LXB1Yg==
-----END PUBLIC KEY-----',
  'Ed25519',
  true,
  'attestation',
  '{"description": "MVP test key for development", "environment": "development"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata;

-- Create function to rotate keys (for future use)
CREATE OR REPLACE FUNCTION rotate_signing_key(
  new_key_id text,
  new_private_key text,
  new_public_key text,
  purpose text DEFAULT 'attestation'
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Deactivate current active keys
  UPDATE signing_keys 
  SET is_active = false 
  WHERE key_purpose = purpose AND is_active = true;
  
  -- Insert new active key
  INSERT INTO signing_keys (
    id,
    private_key,
    public_key,
    algorithm,
    is_active,
    key_purpose,
    metadata
  ) VALUES (
    new_key_id,
    new_private_key,
    new_public_key,
    'Ed25519',
    true,
    purpose,
    jsonb_build_object('rotated_at', now(), 'environment', 'production')
  );
  
  RETURN true;
END;
$$;