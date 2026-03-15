-- Add bonus system columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_balance DECIMAL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wagering_requirement DECIMAL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wagering_total DECIMAL DEFAULT 0;

-- Add metadata column to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Atomic function to claim rain bonus
CREATE OR REPLACE FUNCTION claim_rain(
    p_message_id UUID,
    p_claimer_address TEXT,
    p_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
    v_claimed_by TEXT;
BEGIN
    -- 1. Get current claimer status
    SELECT metadata->>'claimed_by' INTO v_claimed_by
    FROM chat_messages
    WHERE id = p_message_id FOR UPDATE;

    -- 2. If already claimed, return false
    IF v_claimed_by IS NOT NULL THEN
        RETURN FALSE;
    END IF;

    -- 3. Update message metadata
    UPDATE chat_messages
    SET metadata = jsonb_set(metadata, '{claimed_by}', to_jsonb(p_claimer_address))
    WHERE id = p_message_id;

    -- 4. Update user balance (increment bonus_balance)
    UPDATE users
    SET bonus_balance = bonus_balance + p_amount
    WHERE wallet_address = p_claimer_address;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
