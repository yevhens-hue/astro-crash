-- VIP Cashback System
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add VIP fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_points DECIMAL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_cashback_rate DECIMAL DEFAULT 0.05;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_net_loss DECIMAL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_cashback_calculated_at TIMESTAMPTZ;

-- Create table for cashback history
CREATE TABLE IF NOT EXISTS vip_cashbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    rate DECIMAL NOT NULL,
    net_loss DECIMAL NOT NULL,
    vip_level_at_time INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
    calculated_for_period_start TIMESTAMPTZ NOT NULL,
    calculated_for_period_end TIMESTAMPTZ NOT NULL,
    credited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vip_cashbacks_user_id ON vip_cashbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_cashbacks_status ON vip_cashbacks(status);
CREATE INDEX IF NOT EXISTS idx_vip_cashbacks_created_at ON vip_cashbacks(created_at DESC);

-- Enable RLS
ALTER TABLE vip_cashbacks ENABLE ROW LEVEL SECURITY;

-- Policies: users can read their own cashback history
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own cashbacks') THEN
        CREATE POLICY "Users can read own cashbacks" ON vip_cashbacks
            FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can insert cashbacks') THEN
        CREATE POLICY "Service role can insert cashbacks" ON vip_cashbacks
            FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can update cashbacks') THEN
        CREATE POLICY "Service role can update cashbacks" ON vip_cashbacks
            FOR UPDATE USING (true);
    END IF;
END $$;

-- Function to calculate VIP level based on points
CREATE OR REPLACE FUNCTION calculate_vip_level(p_points DECIMAL) RETURNS INTEGER AS $$
BEGIN
    CASE
        WHEN p_points >= 100000 THEN RETURN 5; -- Diamond
        WHEN p_points >= 50000 THEN RETURN 4;  -- Platinum
        WHEN p_points >= 25000 THEN RETURN 3;  -- Gold
        WHEN p_points >= 10000 THEN RETURN 2;  -- Silver
        ELSE RETURN 1;                          -- Bronze
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get cashback rate for VIP level
CREATE OR REPLACE FUNCTION get_vip_cashback_rate(p_level INTEGER) RETURNS DECIMAL AS $$
BEGIN
    CASE
        WHEN p_level = 5 THEN RETURN 0.15; -- Diamond: 15%
        WHEN p_level = 4 THEN RETURN 0.12; -- Platinum: 12%
        WHEN p_level = 3 THEN RETURN 0.10; -- Gold: 10%
        WHEN p_level = 2 THEN RETURN 0.07; -- Silver: 7%
        ELSE RETURN 0.05;                  -- Bronze: 5%
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get next level points requirement
CREATE OR REPLACE FUNCTION get_next_level_points(p_level INTEGER) RETURNS DECIMAL AS $$
BEGIN
    CASE
        WHEN p_level = 1 THEN RETURN 10000;
        WHEN p_level = 2 THEN RETURN 25000;
        WHEN p_level = 3 THEN RETURN 50000;
        WHEN p_level = 4 THEN RETURN 100000;
        ELSE RETURN NULL; -- Max level reached
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate weekly net loss for a user
CREATE OR REPLACE FUNCTION calculate_weekly_net_loss(
    p_user_id UUID,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
    v_total_bets DECIMAL := 0;
    v_total_wins DECIMAL := 0;
BEGIN
    -- Get total bets placed in period
    SELECT COALESCE(SUM(amount), 0) INTO v_total_bets
    FROM bets
    WHERE user_id = p_user_id
    AND created_at >= p_period_start
    AND created_at < p_period_end;

    -- Get total winnings in period (where status is 'cashed' and win_amount > 0)
    SELECT COALESCE(SUM(win_amount), 0) INTO v_total_wins
    FROM bets
    WHERE user_id = p_user_id
    AND status = 'cashed'
    AND created_at >= p_period_start
    AND created_at < p_period_end;

    -- Net loss = bets - wins (if positive, user lost money)
    RETURN GREATEST(0, v_total_bets - v_total_wins);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate pending cashback for a user
CREATE OR REPLACE FUNCTION get_pending_cashback(p_user_id UUID) RETURNS TABLE (
    amount DECIMAL,
    rate DECIMAL,
    net_loss DECIMAL,
    vip_level INTEGER
) AS $$
DECLARE
    v_vip_level INTEGER;
    v_cashback_rate DECIMAL;
    v_net_loss DECIMAL;
    v_cashback_amount DECIMAL;
    v_last_calculated TIMESTAMPTZ;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Get user's current VIP level
    SELECT vip_level, vip_cashback_rate, weekly_net_loss, last_cashback_calculated_at
    INTO v_vip_level, v_cashback_rate, v_net_loss, v_last_calculated
    FROM users
    WHERE id = p_user_id;

    -- If no last calculation, use current week
    IF v_last_calculated IS NULL THEN
        -- Get start of current week (Sunday 00:00 UTC)
        v_period_end := DATE_TRUNC('week', NOW()) + INTERVAL '7 days';
        v_period_start := DATE_TRUNC('week', NOW());
    ELSE
        v_period_start := v_last_calculated;
        v_period_end := v_period_start + INTERVAL '7 days';
    END IF;

    -- Recalculate net loss for current period
    v_net_loss := calculate_weekly_net_loss(p_user_id, v_period_start, v_period_end);
    v_cashback_rate := get_vip_cashback_rate(v_vip_level);
    v_cashback_amount := v_net_loss * v_cashback_rate;

    -- Minimum cashback is 1 TON
    IF v_cashback_amount < 1 THEN
        v_cashback_amount := 0;
    END IF;

    RETURN QUERY SELECT v_cashback_amount, v_cashback_rate, v_net_loss, v_vip_level;
END;
$$ LANGUAGE plpgsql;

-- Function to credit weekly cashback (called by cron job)
CREATE OR REPLACE FUNCTION credit_weekly_cashback() RETURNS INTEGER AS $$
DECLARE
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_user RECORD;
    v_net_loss DECIMAL;
    v_cashback_amount DECIMAL;
    v_cashback_rate DECIMAL;
    v_credited_count INTEGER := 0;
BEGIN
    -- Calculate period (last week: Sunday to Sunday)
    v_period_end := DATE_TRUNC('week', NOW());
    v_period_start := v_period_end - INTERVAL '7 days';

    -- Loop through all active users
    FOR v_user IN SELECT id, vip_level, vip_cashback_rate FROM users LOOP
        -- Calculate net loss for the period
        v_net_loss := calculate_weekly_net_loss(v_user.id, v_period_start, v_period_end);
        
        -- Skip if no net loss
        IF v_net_loss <= 0 THEN
            CONTINUE;
        END IF;

        -- Get cashback rate
        v_cashback_rate := get_vip_cashback_rate(v_user.vip_level);
        
        -- Calculate cashback amount
        v_cashback_amount := v_net_loss * v_cashback_rate;

        -- Minimum cashback is 1 TON
        IF v_cashback_amount >= 1 THEN
            -- Create cashback record
            INSERT INTO vip_cashbacks (
                user_id,
                amount,
                rate,
                net_loss,
                vip_level_at_time,
                status,
                calculated_for_period_start,
                calculated_for_period_end,
                credited_at
            ) VALUES (
                v_user.id,
                v_cashback_amount,
                v_cashback_rate,
                v_net_loss,
                v_user.vip_level,
                'credited',
                v_period_start,
                v_period_end,
                NOW()
            );

            -- Add cashback to user balance
            UPDATE users
            SET balance = balance + v_cashback_amount,
                last_cashback_calculated_at = v_period_end
            WHERE id = v_user.id;

            -- Add VIP points (1 point per 1 TON wagered)
            UPDATE users
            SET vip_points = vip_points + v_net_loss,
                vip_level = calculate_vip_level(vip_points + v_net_loss),
                vip_cashback_rate = get_vip_cashback_rate(calculate_vip_level(vip_points + v_net_loss))
            WHERE id = v_user.id;

            v_credited_count := v_credited_count + 1;
        END IF;
    END LOOP;

    RETURN v_credited_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule weekly cashback cron job (every Sunday at 00:00 UTC)
-- Note: This requires pg_cron extension to be enabled on Supabase
SELECT cron.schedule(
    'weekly-cashback',
    '0 0 * * 0',  -- Every Sunday at 00:00 UTC
    $$SELECT credit_weekly_cashback()$$
);
