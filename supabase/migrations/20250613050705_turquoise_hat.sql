/*
  # Authentication Providers Table

  1. New Tables
    - `auth_providers`
      - `id` (text, primary key) - Provider identifier (google, github, etc.)
      - `name` (text) - Display name
      - `enabled` (boolean) - Whether provider is enabled
      - `icon_url` (text) - URL to provider icon
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `auth_providers` table
    - Add policy for public read access (no authentication required)

  3. Initial Data
    - Insert Google and GitHub providers
*/

-- Create auth_providers table
CREATE TABLE IF NOT EXISTS auth_providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  enabled boolean DEFAULT true,
  icon_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE auth_providers ENABLE ROW LEVEL SECURITY;

-- Allow public read access to auth providers
CREATE POLICY "Auth providers are publicly readable"
  ON auth_providers
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert initial providers
INSERT INTO auth_providers (id, name, enabled, icon_url) VALUES
  ('google', 'Google', true, 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'),
  ('github', 'GitHub', true, 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  enabled = EXCLUDED.enabled,
  icon_url = EXCLUDED.icon_url,
  updated_at = now();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_auth_providers_updated_at
  BEFORE UPDATE ON auth_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();