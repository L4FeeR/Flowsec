-- ==============================================
-- COMPLETE SUPABASE DATABASE SETUP FOR FLOWSEC
-- ==============================================
-- Run this entire script in Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- 4. Create RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" 
    ON public.profiles 
    FOR DELETE 
    USING (auth.uid() = id);

-- 5. Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-pics', 
    'profile-pics', 
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 6. Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;

-- 7. Create storage policies
CREATE POLICY "Anyone can view profile pictures"
    ON storage.objects 
    FOR SELECT
    USING (bucket_id = 'profile-pics');

CREATE POLICY "Users can upload their own profile picture"
    ON storage.objects 
    FOR INSERT
    WITH CHECK (
        bucket_id = 'profile-pics' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own profile picture"
    ON storage.objects 
    FOR UPDATE
    USING (
        bucket_id = 'profile-pics' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete their own profile picture"
    ON storage.objects 
    FOR DELETE
    USING (
        bucket_id = 'profile-pics' 
        AND auth.role() = 'authenticated'
    );

-- 8. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 10. Create index for faster username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- 11. Create index for faster user id lookups
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles(id);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================
-- Run these after the setup to verify everything works

-- Check if profiles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) AS profiles_table_exists;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'profile-pics';

-- Check storage policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%profile%';

-- ==============================================
-- TEST DATA (OPTIONAL - for testing only)
-- ==============================================
-- Uncomment and run this to insert test data after authentication

-- INSERT INTO public.profiles (id, username, gender, avatar_url)
-- VALUES (
--     auth.uid(), -- This will be the authenticated user's ID
--     'testuser',
--     'male',
--     'https://example.com/avatar.jpg'
-- );

-- ==============================================
-- CLEANUP (if you need to start over)
-- ==============================================
-- Uncomment to delete everything and start fresh

-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DELETE FROM storage.buckets WHERE id = 'profile-pics';
-- DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
