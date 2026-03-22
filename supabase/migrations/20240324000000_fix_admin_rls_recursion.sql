-- Fix infinite recursion in users policies caused by 20240323000001_add_is_admin.sql

-- Drop the broken policies
DROP POLICY IF EXISTS "Admins can read all users data" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- Create a secure helper function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin_flag boolean;
    wallet text;
    jwt_claims text;
BEGIN
    -- Use false to avoid throwing when setting doesn't exist
    jwt_claims := current_setting('request.jwt.claims', false);
    IF jwt_claims IS NULL OR jwt_claims = '' THEN
        RETURN false;
    END IF;

    wallet := jwt_claims::json->>'sub';
    IF wallet IS NULL OR wallet = '' THEN
        RETURN false;
    END IF;

    SELECT is_admin INTO is_admin_flag FROM users WHERE wallet_address = wallet;
    RETURN COALESCE(is_admin_flag, false);
END;
$$;

-- Create fixed policies using the helper function
CREATE POLICY "Admins can read all users data"
ON users FOR SELECT
USING (check_is_admin());

CREATE POLICY "Admins can update users"
ON users FOR UPDATE
USING (check_is_admin());
