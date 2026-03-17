-- Create leaderboard rewards table
CREATE TABLE IF NOT EXISTS leaderboard_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    rank_from INTEGER NOT NULL,
    rank_to INTEGER NOT NULL,
    reward_amount DECIMAL(20, 2) NOT NULL,
    reward_type TEXT DEFAULT 'balance' CHECK (reward_type IN ('balance', 'bonus', 'freespins')),
    is_claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leaderboard_rewards ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read leaderboard_rewards" ON leaderboard_rewards FOR SELECT USING (true);

-- Allow authenticated users to claim rewards
CREATE POLICY "Allow public insert leaderboard_rewards" ON leaderboard_rewards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update leaderboard_rewards" ON leaderboard_rewards FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_period ON leaderboard_rewards(period_type, period_start, period_end);

-- Insert default rewards
INSERT INTO leaderboard_rewards (period_type, period_start, period_end, rank_from, rank_to, reward_amount, reward_type) VALUES
-- Daily rewards
('daily', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 1, 1, 10, 'balance'),
('daily', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 2, 2, 5, 'balance'),
('daily', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 3, 3, 2, 'balance'),
-- Weekly rewards
('weekly', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 1, 1, 50, 'balance'),
('weekly', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 2, 2, 25, 'balance'),
('weekly', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 3, 3, 10, 'balance'),
('weekly', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 4, 10, 5, 'bonus'),
-- Monthly rewards
('monthly', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 1, 1, 200, 'balance'),
('monthly', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 2, 2, 100, 'balance'),
('monthly', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 3, 3, 50, 'balance'),
('monthly', '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', 4, 10, 25, 'bonus')
ON CONFLICT DO NOTHING;
