-- Add is_bonus column to bets table if it doesn't exist
ALTER TABLE bets ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN DEFAULT FALSE;

-- Fix negative balances (emergency fix)
UPDATE users SET balance = 0 WHERE balance < 0;
UPDATE users SET bonus_balance = 0 WHERE bonus_balance < 0;

-- Ensure constraints are in place
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_balance_non_negative;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_bonus_non_negative;
ALTER TABLE users ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);
ALTER TABLE users ADD CONSTRAINT check_bonus_non_negative CHECK (bonus_balance >= 0);
