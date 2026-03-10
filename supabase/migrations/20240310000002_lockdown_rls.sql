-- PROD SECURITY LOCKDOWN: Restrictive RLS Policies
-- This migration replaces the permissive "public" policies with restricted access.
-- Operations on sensitive tables like `users`, `bets`, and `transactions` 
-- should now be routed through authenticated Supabase Edge Functions.

-- Keep generic reads open so the frontend can still display the leaderboard and current balance
-- But STOP all inserts and updates that do not originate from an authenticated server.

---------------------------------------------------------------------------------
-- USERS TABLE
---------------------------------------------------------------------------------
-- Allow users to read all user data (for leaderboards/chat)
DROP POLICY IF EXISTS "Allow public read users" ON users;
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);

-- Allow new wallet registrations (only if insert does not specify an elevated balance)
-- A production app might want to lock this down to edge functions too,
-- but for now, we allow public insert OF JUST THE WALLET. 
-- However, we must ensure they can't set their balance to 1000 on insert.
DROP POLICY IF EXISTS "Allow public insert into users" ON users;
CREATE POLICY "Allow public insert into users" ON users FOR INSERT WITH CHECK (balance = 0);

-- DISABLE public updates to users table completely. 
-- Only service_role keys (Edge Functions) can update the balance now.
DROP POLICY IF EXISTS "Allow public update users" ON users;
CREATE POLICY "Deny public update users" ON users FOR UPDATE USING (false);

---------------------------------------------------------------------------------
-- BETS TABLE
---------------------------------------------------------------------------------
-- Anyone can see bets (for live history and leaderboards)
DROP POLICY IF EXISTS "Allow public read bets" ON bets;
CREATE POLICY "Allow public read bets" ON bets FOR SELECT USING (true);

-- DISABLE all public inserts and updates.
-- All bets must be placed via the `place-bet` Edge Function to ensure balance deduction.
-- All cashouts must be processed via the `cashout-bet` Edge Function to ensure valid crash calculations.
DROP POLICY IF EXISTS "Allow public insert into bets" ON bets;
CREATE POLICY "Deny public insert bets" ON bets FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Allow public update bets" ON bets;
CREATE POLICY "Deny public update bets" ON bets FOR UPDATE USING (false);

---------------------------------------------------------------------------------
-- SLOT SPINS TABLE
---------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE slot_spins ENABLE ROW LEVEL SECURITY;

-- Allow public read
DROP POLICY IF EXISTS "Allow public read slot_spins" ON slot_spins;
CREATE POLICY "Allow public read slot_spins" ON slot_spins FOR SELECT USING (true);

-- DISABLE public inserts and updates (spin-slot Edge Function only)
DROP POLICY IF EXISTS "Allow public insert slot_spins" ON slot_spins;
CREATE POLICY "Deny public insert slot_spins" ON slot_spins FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Allow public update slot_spins" ON slot_spins;
CREATE POLICY "Deny public update slot_spins" ON slot_spins FOR UPDATE USING (false);

---------------------------------------------------------------------------------
-- TRANSACTIONS TABLE
---------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow public read of their own transactions (or all if desired for history)
DROP POLICY IF EXISTS "Allow public read transactions" ON transactions;
CREATE POLICY "Allow public read transactions" ON transactions FOR SELECT USING (true);

-- DISABLE public inserts and updates (ton-webhook Edge Function only)
DROP POLICY IF EXISTS "Allow public insert transactions" ON transactions;
CREATE POLICY "Deny public insert transactions" ON transactions FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Allow public update transactions" ON transactions;
CREATE POLICY "Deny public update transactions" ON transactions FOR UPDATE USING (false);

---------------------------------------------------------------------------------
-- ROUNDS TABLE
---------------------------------------------------------------------------------
-- Allow public read to get crash points and history
DROP POLICY IF EXISTS "Allow public read rounds" ON rounds;
CREATE POLICY "Allow public read rounds" ON rounds FOR SELECT USING (true);

-- DISABLE public inserts (generate-round Edge Function only)
DROP POLICY IF EXISTS "Allow public insert rounds" ON rounds;
CREATE POLICY "Deny public insert rounds" ON rounds FOR INSERT WITH CHECK (false);

-- DISABLE public updates
DROP POLICY IF EXISTS "Allow public update rounds" ON rounds;
CREATE POLICY "Deny public update rounds" ON rounds FOR UPDATE USING (false);

---------------------------------------------------------------------------------
-- SUMMARY
-- All data changes must now be done securely on the backend (Edge Functions) using 
-- the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS constraints.
---------------------------------------------------------------------------------
