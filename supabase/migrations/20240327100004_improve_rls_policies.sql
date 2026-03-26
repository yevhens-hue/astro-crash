-- Improve RLS policies with NULL checks for better security

-- Drop existing policies
DROP POLICY IF EXISTS user_read_own ON users;
DROP POLICY IF EXISTS bets_read_own ON bets;
DROP POLICY IF EXISTS slots_read_own ON slot_spins;

-- Users Policy: Can only see their own profile (with NULL check)
CREATE POLICY user_read_own ON users 
FOR SELECT USING (
  wallet_address IS NOT NULL AND
  wallet_address = (current_setting('request.headers', true)::jsonb->>'x-wallet-address')
);

-- Bets Policy: Can only see their own bets (with NULL check)
CREATE POLICY bets_read_own ON bets
FOR SELECT USING (
  user_id IN (
    SELECT id FROM users 
    WHERE wallet_address IS NOT NULL 
    AND wallet_address = (current_setting('request.headers', true)::jsonb->>'x-wallet-address')
  )
);

-- Slot spins Policy: Can only see their own spins (with NULL check)
CREATE POLICY slots_read_own ON slot_spins
FOR SELECT USING (
  wallet_address IS NOT NULL AND
  wallet_address = (current_setting('request.headers', true)::jsonb->>'x-wallet-address')
);

-- Chat Policy: Anyone can read, only authenticated can write
DROP POLICY IF EXISTS chat_read_all ON chat_messages;
CREATE POLICY chat_read_all ON chat_messages FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_slot_spins_wallet_address ON slot_spins(wallet_address) WHERE wallet_address IS NOT NULL;
