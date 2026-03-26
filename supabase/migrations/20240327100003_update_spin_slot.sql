CREATE OR REPLACE FUNCTION spin_slot_atomic(
    p_user_address TEXT,
    p_cost DECIMAL,
    p_win_amount DECIMAL,
    p_is_bonus BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_new_balance DECIMAL;
    v_new_bonus DECIMAL;
    v_net_change DECIMAL;
    v_current_total DECIMAL;
BEGIN
    SELECT id, balance, bonus_balance
    INTO v_user_id, v_new_balance, v_new_bonus
    FROM users
    WHERE wallet_address = p_user_address
    FOR UPDATE;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    v_current_total := COALESCE(v_new_balance, 0) + COALESCE(v_new_bonus, 0);

    IF v_current_total < p_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    v_net_change := p_win_amount - p_cost;

    IF p_is_bonus THEN
        UPDATE users SET bonus_balance = bonus_balance + v_net_change WHERE id = v_user_id;
    ELSE
        UPDATE users SET balance = balance + v_net_change WHERE id = v_user_id;
        UPDATE users SET wagering_total = wagering_total + p_cost WHERE id = v_user_id;
        PERFORM distribute_referral_rewards(v_user_id, NULL, p_cost);
    END IF;

    SELECT balance, bonus_balance INTO v_new_balance, v_new_bonus FROM users WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'new_bonus', v_new_bonus
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
