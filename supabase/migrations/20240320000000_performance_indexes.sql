-- Performance optimization indexes
-- These indexes improve query performance for common operations

-- ===========================================
-- Bets table indexes
-- ===========================================

-- Index for fetching user's recent bets
CREATE INDEX IF NOT EXISTS idx_bets_user_id 
    ON bets(user_id) 
    WHERE status IN ('confirmed', 'cashed', 'lost');

-- Index for fetching bets by round
CREATE INDEX IF NOT EXISTS idx_bets_round_id 
    ON bets(round_id);

-- Index for leaderboard queries (top winners)
CREATE INDEX IF NOT EXISTS idx_bets_win_amount 
    ON bets(win_amount DESC) 
    WHERE status = 'cashed';

-- Index for cashback calculation
CREATE INDEX IF NOT EXISTS idx_bets_user_status_created 
    ON bets(user_id, status, created_at DESC);

-- ===========================================
-- Slot spins table indexes
-- ===========================================

-- Index for jackpot history
CREATE INDEX IF NOT EXISTS idx_slot_spins_win_amount 
    ON slot_spins(win_amount DESC) 
    WHERE win_amount > 0;

-- Index for user's slot history
CREATE INDEX IF NOT EXISTS idx_slot_spins_user 
    ON slot_spins(wallet_address, created_at DESC);

-- ===========================================
-- Transactions table indexes
-- ===========================================

-- Index for balance queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_type 
    ON transactions(wallet_address, type, created_at DESC);

-- Index for deposit/withdrawal history
CREATE INDEX IF NOT EXISTS idx_transactions_status 
    ON transactions(status, type, created_at DESC);

-- ===========================================
-- Chat messages indexes
-- ===========================================

-- Index for recent chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_created 
    ON chat_messages(created_at DESC);

-- ===========================================
-- Rounds table indexes (Crash game)
-- ===========================================

-- Index for active rounds
CREATE INDEX IF NOT EXISTS idx_rounds_status_created 
    ON rounds(status, created_at DESC);

-- Index for crash point statistics
CREATE INDEX IF NOT EXISTS idx_rounds_crash_point 
    ON rounds(crash_point) 
    WHERE status = 'crashed';

-- ===========================================
-- Analyze tables to update statistics
-- ===========================================
ANALYZE bets;
ANALYZE slot_spins;
ANALYZE transactions;
ANALYZE chat_messages;
ANALYZE rounds;
