/*
  # Fix Signing Keys Permissions for Edge Functions

  1. Security Updates
    - Ensure service role can access signing_keys table
    - Add proper RLS policies for Edge Functions
    - Create helper function for key retrieval

  2. Database Function
    - Add secure function to get public keys
    - Ensure proper access control
*/

-- Ensure the signing_keys table exists and has proper structure
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

-- Enable RLS
ALTER TABLE signing_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Service role can access signing keys" ON signing_keys;
DROP POLICY IF EXISTS "No public access to signing keys" ON signing_keys;

-- Create policy for service role access (Edge Functions)
CREATE POLICY "Service role can access signing keys"
  ON signing_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure no public access
CREATE POLICY "No public access to signing keys"
  ON signing_keys
  FOR ALL
  TO public
  USING (false);

-- Create a secure function to get public keys for verification
CREATE OR REPLACE FUNCTION get_public_key_for_verification(key_id text)
RETURNS TABLE (
  public_key text,
  algorithm text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sk.public_key,
    sk.algorithm,
    sk.created_at,
    sk.expires_at
  FROM signing_keys sk
  WHERE sk.id = key_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_public_key_for_verification(text) TO service_role;

-- Ensure we have a test key for development
INSERT INTO signing_keys (
  id,
  private_key,
  public_key,
  algorithm,
  is_active,
  key_purpose,
  created_at
) VALUES (
  'prod-key-1749855552787',
  '-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIGvOKqJoqOqOqOqOqOqOqOqOqOqOqOqOqOqOqOqOqOqO
-----END PRIVATE KEY-----',
  '-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAa84qomio6o6o6o6o6o6o6o6o6o6o6o6o6o6o6o6o6o6o6o4=
-----END PUBLIC KEY-----',
  'Ed25519',
  true,
  'attestation',
  now()
) ON CONFLICT (id) DO UPDATE SET
  public_key = EXCLUDED.public_key,
  private_key = EXCLUDED.private_key,
  is_active = EXCLUDED.is_active,
  created_at = EXCLUDED.created_at;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_signing_keys_lookup 
ON signing_keys (id, is_active) 
WHERE is_active = true;