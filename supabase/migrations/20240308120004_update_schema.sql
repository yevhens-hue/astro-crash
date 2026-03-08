-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- Ensure balance has a default
ALTER TABLE users ALTER COLUMN balance SET DEFAULT 0;

-- Update Rounds Table for better tracking
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS duration DECIMAL;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS total_bets DECIMAL DEFAULT 0;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS total_payout DECIMAL DEFAULT 0;

-- Add RLS (Row Level Security) - Basic for now
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read users') THEN
        CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read rounds') THEN
        CREATE POLICY "Allow public read rounds" ON rounds FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read bets') THEN
        CREATE POLICY "Allow public read bets" ON bets FOR SELECT USING (true);
    END IF;
END $$;
