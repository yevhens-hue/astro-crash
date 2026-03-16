-- Progressive Jackpot System for Slots

-- Jackpot table
CREATE TABLE IF NOT EXISTS slot_jackpots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_amount DECIMAL NOT NULL DEFAULT 10.00,
    initial_amount DECIMAL NOT NULL DEFAULT 10.00,
    last_win_amount DECIMAL DEFAULT 0,
    last_winner_address TEXT,
    last_win_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jackpot history table
CREATE TABLE IF NOT EXISTS slot_jackpot_wins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jackpot_id UUID REFERENCES slot_jackpots(id),
    winner_address TEXT NOT NULL,
    win_amount DECIMAL NOT NULL,
    win_type TEXT NOT NULL, -- '777' | '💎' | '👑'
    percentage DECIMAL NOT NULL, -- 100 | 50 | 25
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize default jackpot
INSERT INTO slot_jackpots (current_amount, initial_amount)
SELECT 10.00, 10.00
WHERE NOT EXISTS (SELECT 1 FROM slot_jackpots);

-- Function to contribute to jackpot (called on each spin)
CREATE OR REPLACE FUNCTION contribute_to_jackpot(p_cost DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    contribution DECIMAL;
    new_amount DECIMAL;
BEGIN
    contribution := p_cost * 0.005; -- 0.5% of bet
    UPDATE slot_jackpots 
    SET current_amount = current_amount + contribution,
        updated_at = NOW()
    RETURNING current_amount INTO new_amount;
    RETURN contribution;
END;
$$ LANGUAGE plpgsql;

-- Function to process jackpot win
CREATE OR REPLACE FUNCTION process_jackpot_win(
    p_winner_address TEXT,
    p_symbol TEXT,
    p_current_jackpot DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    win_percentage DECIMAL;
    win_amount DECIMAL;
    jackpot_id UUID;
BEGIN
    -- Determine win percentage based on symbol
    CASE p_symbol
        WHEN '777' THEN win_percentage := 1.00; -- 100%
        WHEN '💎' THEN win_percentage := 0.50; -- 50%
        WHEN '👑' THEN win_percentage := 0.25; -- 25%
        ELSE win_percentage := 0;
    END CASE;

    IF win_percentage = 0 THEN
        RETURN 0;
    END IF;

    win_amount := p_current_jackpot * win_percentage;
    
    -- Get jackpot ID
    SELECT id INTO jackpot_id FROM slot_jackpots LIMIT 1;

    -- Record the win
    INSERT INTO slot_jackpot_wins (jackpot_id, winner_address, win_amount, win_type, percentage)
    VALUES (jackpot_id, p_winner_address, win_amount, p_symbol, win_percentage * 100);

    -- Reset jackpot
    UPDATE slot_jackpots 
    SET current_amount = initial_amount,
        last_win_amount = win_amount,
        last_winner_address = p_winner_address,
        last_win_at = NOW(),
        updated_at = NOW()
    WHERE id = jackpot_id;

    RETURN win_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to get current jackpot
CREATE OR REPLACE FUNCTION get_current_jackpot()
RETURNS TABLE(
    current_amount DECIMAL,
    last_win_amount DECIMAL,
    last_winner_address TEXT,
    last_win_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.current_amount,
        j.last_win_amount,
        j.last_winner_address,
        j.last_win_at
    FROM slot_jackpots j
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for jackpot tables
ALTER TABLE slot_jackpots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_jackpot_wins ENABLE ROW LEVEL SECURITY;

-- Anyone can read jackpot data
CREATE POLICY "Anyone can read jackpots" ON slot_jackpots
    FOR SELECT USING (true);

CREATE POLICY "Anyone can read jackpot wins" ON slot_jackpot_wins
    FOR SELECT USING (true);

-- Only service role can update jackpots
CREATE POLICY "Service can update jackpots" ON slot_jackpots
    FOR UPDATE USING (true);

CREATE POLICY "Service can insert jackpot wins" ON slot_jackpot_wins
    FOR INSERT WITH CHECK (true);