-- Atomic deposit function to prevent race conditions
-- This function handles both balance update and transaction logging in a single transaction

CREATE OR REPLACE FUNCTION credit_deposit_atomic(
    p_wallet_address TEXT,
    p_amount DECIMAL,
    p_tx_hash TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_new_balance DECIMAL;
BEGIN
    -- Validate inputs
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
    END IF;

    IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet address is required');
    END IF;

    -- Check if transaction already processed
    IF EXISTS (SELECT 1 FROM transactions WHERE tx_hash = p_tx_hash) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction already processed');
    END IF;

    -- Get user and lock the row for update to prevent race conditions
    SELECT id, balance INTO v_user_id, v_new_balance
    FROM users
    WHERE wallet_address = p_wallet_address
    FOR UPDATE;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found for wallet: ' || p_wallet_address);
    END IF;

    -- Update balance (atomic increment)
    UPDATE users 
    SET balance = balance + p_amount
    WHERE id = v_user_id
    RETURNING balance INTO v_new_balance;

    -- Insert transaction record
    INSERT INTO transactions (user_id, amount, type, status, tx_hash, wallet_address)
    VALUES (v_user_id, p_amount, 'deposit', 'completed', p_tx_hash, p_wallet_address);

    RETURN jsonb_build_object(
        'success', true, 
        'user_id', v_user_id,
        'new_balance', v_new_balance,
        'amount', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
