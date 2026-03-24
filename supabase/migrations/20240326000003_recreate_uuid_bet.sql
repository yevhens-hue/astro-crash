CREATE OR REPLACE FUNCTION place_bet_atomic(
    p_user_address TEXT,
    p_round_id UUID,
    p_amount DECIMAL,
    p_is_bonus BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_current_balance DECIMAL;
    v_current_bonus DECIMAL;
    v_total_available DECIMAL;
    v_new_bet_id UUID;
BEGIN
    SELECT id, balance, bonus_balance
    INTO v_user_id, v_current_balance, v_current_bonus
    FROM users
    WHERE wallet_address = p_user_address
    FOR UPDATE;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    v_total_available := COALESCE(v_current_balance, 0) + COALESCE(v_current_bonus, 0);
    
    IF v_total_available < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    IF p_is_bonus THEN
        IF COALESCE(v_current_bonus, 0) >= p_amount THEN
            UPDATE users SET bonus_balance = bonus_balance - p_amount WHERE id = v_user_id;
        ELSE
            DECLARE
                v_remaining DECIMAL;
            BEGIN
                v_remaining := p_amount - COALESCE(v_current_bonus, 0);
                UPDATE users SET 
                    balance = balance - v_remaining,
                    bonus_balance = 0
                WHERE id = v_user_id;
            END;
        END IF;
    ELSE
        IF COALESCE(v_current_balance, 0) >= p_amount THEN
            UPDATE users SET balance = balance - p_amount WHERE id = v_user_id;
        ELSE
            DECLARE
                v_remaining DECIMAL;
            BEGIN
                v_remaining := p_amount - COALESCE(v_current_balance, 0);
                UPDATE users SET 
                    balance = 0,
                    bonus_balance = bonus_balance - v_remaining
                WHERE id = v_user_id;
            END;
        END IF;
        
        UPDATE users SET wagering_total = wagering_total + p_amount WHERE id = v_user_id;
    END IF;

    INSERT INTO bets (user_id, round_id, amount, status, is_bonus)
    VALUES (v_user_id, p_round_id, p_amount, 'confirmed', p_is_bonus)
    RETURNING id INTO v_new_bet_id;

    IF NOT p_is_bonus THEN
        PERFORM distribute_referral_rewards(v_user_id, v_new_bet_id, p_amount);
    END IF;

    SELECT balance + bonus_balance INTO v_total_available FROM users WHERE id = v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'bet_id', v_new_bet_id,
        'new_balance', v_total_available
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
