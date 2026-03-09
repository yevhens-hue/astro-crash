-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- USERS: Allow anyone to insert (for wallet registration) and read/update own row
DROP POLICY IF EXISTS "Allow public insert into users" ON users;
CREATE POLICY "Allow public insert into users"
  ON users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read users" ON users;
CREATE POLICY "Allow public read users"
  ON users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public update users" ON users;
CREATE POLICY "Allow public update users"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- BETS: Allow anyone to insert and read
DROP POLICY IF EXISTS "Allow public insert into bets" ON bets;
CREATE POLICY "Allow public insert into bets"
  ON bets FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read bets" ON bets;
CREATE POLICY "Allow public read bets"
  ON bets FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public update bets" ON bets;
CREATE POLICY "Allow public update bets"
  ON bets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ROUNDS: Allow public read
DROP POLICY IF EXISTS "Allow public read rounds" ON rounds;
CREATE POLICY "Allow public read rounds"
  ON rounds FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert rounds" ON rounds;
CREATE POLICY "Allow public insert rounds"
  ON rounds FOR INSERT
  WITH CHECK (true);

-- REFERRAL_REWARDS: Allow public read and insert
DROP POLICY IF EXISTS "Allow public insert referral_rewards" ON referral_rewards;
CREATE POLICY "Allow public insert referral_rewards"
  ON referral_rewards FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read referral_rewards" ON referral_rewards;
CREATE POLICY "Allow public read referral_rewards"
  ON referral_rewards FOR SELECT
  USING (true);
