-- Create sessions table for tracking user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    total_bets DECIMAL(20, 2) DEFAULT 0,
    total_wins DECIMAL(20, 2) DEFAULT 0,
    total_deposits DECIMAL(20, 2) DEFAULT 0,
    total_withdrawals DECIMAL(20, 2) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT,
    platform TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read of own sessions
CREATE POLICY "Allow read own sessions" ON sessions FOR SELECT USING (wallet_address = current_user);

-- Allow authenticated users to insert sessions
CREATE POLICY "Allow insert own sessions" ON sessions FOR INSERT WITH CHECK (wallet_address = current_user);

-- Allow users to update own sessions
CREATE POLICY "Allow update own sessions" ON sessions FOR UPDATE USING (wallet_address = current_user);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_wallet_address ON sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
