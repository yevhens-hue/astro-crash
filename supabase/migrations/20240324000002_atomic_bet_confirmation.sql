-- Atomic bet confirmation function to prevent race conditions
-- This function updates bet status atomically with proper locking

CREATE OR REPLACE FUNCTION confirm_bet_atomic(
    p_tx_hash TEXT
) RETURNS JSONB AS $$
DECLARE
    v_bet_id UUID;
    v_current_status TEXT;
BEGIN
    -- Validate inputs
    IF p_tx_hash IS NULL OR p_tx_hash = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction hash is required');
    END IF;

    -- Check if bet already confirmed (idempotency)
    SELECT id, status INTO v_bet_id, v_current_status
    FROM bets
    WHERE tx_hash = p_tx_hash
    FOR UPDATE;

    IF v_bet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bet not found for tx_hash: ' || p_tx_hash);
    END IF;

    -- Skip if already confirmed
    IF v_current_status = 'confirmed' THEN
        RETURN jsonb_build_object(
            'success', true, 
            'skipped', true,
            'message', 'Bet already confirmed'
        );
    END IF;

    -- Update bet status
    UPDATE bets 
    SET status = 'confirmed'
    WHERE id = v_bet_id;

    RETURN jsonb_build_object(
        'success', true, 
        'bet_id', v_bet_id,
        'previous_status', v_current_status,
        'new_status', 'confirmed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
