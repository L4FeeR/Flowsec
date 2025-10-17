-- Add 'name' column to profiles table
-- Run this in Supabase SQL Editor

-- Add the name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Make it not null for new entries (optional, but recommended)
-- UPDATE public.profiles SET name = username WHERE name IS NULL;
-- ALTER TABLE public.profiles ALTER COLUMN name SET NOT NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
