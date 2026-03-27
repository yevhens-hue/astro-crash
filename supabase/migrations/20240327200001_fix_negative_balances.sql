-- 20240327200001_fix_negative_balances.sql
-- 1. Fix existing negative balances
UPDATE users SET bonus_balance = 0 WHERE bonus_balance < 0;
UPDATE users SET balance = 0 WHERE balance < 0;

-- 2. Add constraints to prevent negative balances in the future
-- Using DO block to check if constraints exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_balance_non_negative') THEN
        ALTER TABLE users ADD CONSTRAINT users_balance_non_negative CHECK (balance >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_bonus_balance_non_negative') THEN
        ALTER TABLE users ADD CONSTRAINT users_bonus_balance_non_negative CHECK (bonus_balance >= 0);
    END IF;
END $$;

-- 3. Correct spin_slot_atomic to use overflow logic and return separate balances
CREATE OR REPLACE FUNCTION spin_slot_atomic(
    p_user_address TEXT,
    p_cost DECIMAL,
    p_win_amount DECIMAL,
    p_is_bonus BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_current_balance DECIMAL;
    v_current_bonus DECIMAL;
    v_total_available DECIMAL;
    v_new_balance DECIMAL;
    v_new_bonus DECIMAL;
BEGIN
    -- Get user and lock row
    SELECT id, balance, bonus_balance
    INTO v_user_id, v_current_balance, v_current_bonus
    FROM users
    WHERE wallet_address = p_user_address
    FOR UPDATE;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Calculate total available
    v_total_available := COALESCE(v_current_balance, 0) + COALESCE(v_current_bonus, 0);

    -- Check if user has enough total balance
    IF v_total_available < p_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- SUBTRACTION LOGIC (Same as place_bet_atomic)
    IF p_is_bonus THEN
        IF COALESCE(v_current_bonus, 0) >= p_cost THEN
            v_current_bonus := v_current_bonus - p_cost;
        ELSE
            -- Overflow to real balance
            v_current_balance := v_current_balance - (p_cost - COALESCE(v_current_bonus, 0));
            v_current_bonus := 0;
        END IF;
    ELSE
        IF COALESCE(v_current_balance, 0) >= p_cost THEN
            v_current_balance := v_current_balance - p_cost;
        ELSE
            -- Overflow to bonus balance
            v_current_bonus := v_current_bonus - (p_cost - COALESCE(v_current_balance, 0));
            v_current_balance := 0;
        END IF;
        -- Update wagering only for real money cost
        UPDATE users SET wagering_total = wagering_total + p_cost WHERE id = v_user_id;
    END IF;

    -- WIN ADDITION LOGIC
    -- Add win back to the requested balance type
    IF p_is_bonus THEN
        v_current_bonus := v_current_bonus + p_win_amount;
    ELSE
        v_current_balance := v_current_balance + p_win_amount;
    END IF;

    -- Final Update
    UPDATE users SET 
        balance = v_current_balance, 
        bonus_balance = v_current_bonus 
    WHERE id = v_user_id;

    -- Optional: distribute referral rewards for real money games
    IF NOT p_is_bonus THEN
        PERFORM distribute_referral_rewards(v_user_id, NULL, p_cost);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_current_balance,
        'new_bonus', v_current_bonus
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
