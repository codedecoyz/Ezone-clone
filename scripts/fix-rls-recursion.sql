-- Fix: Infinite recursion in RLS policy for "users" table
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the problematic RLS policies on users table
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Step 2: Recreate policies using auth.uid() directly (no subquery on users)
-- These simple policies should not cause recursion
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Step 3: Create a SECURITY DEFINER function to safely fetch user details
-- This bypasses RLS entirely, so it can't cause recursion
CREATE OR REPLACE FUNCTION get_user_details(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name VARCHAR,
  role VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
