-- Add telegram_id and username to transactions table for easier viewing
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS telegram_id BIGINT,
ADD COLUMN IF NOT EXISTS username TEXT;

-- Backfill historical data from users table
UPDATE transactions t
SET 
  telegram_id = u.telegram_id,
  username = u.username
FROM users u
WHERE t.user_id = u.id AND (t.telegram_id IS NULL OR t.username IS NULL);
