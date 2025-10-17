-- Add public_key column to profiles table for E2E encryption
-- Run this SQL in Supabase SQL Editor

-- Add public_key column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Add key_fingerprint for verification
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS key_fingerprint TEXT;

-- Add key_created_at timestamp
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS key_created_at TIMESTAMPTZ DEFAULT NOW();

-- Create index on public_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_public_key ON profiles(public_key);

-- Add comment
COMMENT ON COLUMN profiles.public_key IS 'RSA public key for end-to-end encryption (base64 encoded)';
COMMENT ON COLUMN profiles.key_fingerprint IS 'Public key fingerprint for verification';

-- Success message
SELECT 'Public key columns added successfully!' AS status;
