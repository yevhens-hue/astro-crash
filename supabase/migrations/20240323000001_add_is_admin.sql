-- Add is_admin and is_blocked columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
                  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Allow admins to read all user data (useful for general statistics and user management)
CREATE POLICY "Admins can read all users data" 
ON users FOR SELECT 
TO public 
USING (
  EXISTS (
    SELECT 1 FROM users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'sub' AND is_admin = true
  )
);

-- Allow admins to update users (e.g., block them)
CREATE POLICY "Admins can update users" 
ON users FOR UPDATE 
TO public 
USING (
  EXISTS (
    SELECT 1 FROM users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'sub' AND is_admin = true
  )
);

-- Allow admins to update slot jackpots
CREATE POLICY "Admins can update slot jackpots" 
ON slot_jackpots FOR UPDATE 
TO public 
USING (
  EXISTS (
    SELECT 1 FROM users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'sub' AND is_admin = true
  )
);
