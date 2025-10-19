-- FIX: Allow users to see ALL profiles (not just their own)
-- Run this in Supabase SQL Editor

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows viewing ALL profiles
CREATE POLICY "Users can view all profiles" 
    ON public.profiles FOR SELECT 
    USING (true);

-- Keep the other policies (only update your own)
-- Users can still only INSERT/UPDATE their own profile

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';
