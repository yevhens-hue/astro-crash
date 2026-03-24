CREATE OR REPLACE FUNCTION public.cashout_bet_atomic(
    p_bet_id UUID,
    p_cashout_at DECIMAL,
    p_win_amount DECIMAL
) RETURNS JSONB AS $$
DECLARE
    v_bet RECORD;
    v_user RECORD;
    v_current_balance DECIMAL;
BEGIN
    -- Get bet and lock it
    SELECT * INTO v_bet
    FROM bets
    WHERE id = p_bet_id
    FOR UPDATE;

    IF v_bet IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bet not found');
    END IF;

    IF v_bet.status != 'confirmed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bet is not active');
    END IF;

    -- Get user and lock
    SELECT * INTO v_user
    FROM users
    WHERE id = v_bet.user_id
    FOR UPDATE;

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Update bet status
    UPDATE bets
    SET status = 'cashed', cashout_at = p_cashout_at, win_amount = p_win_amount
    WHERE id = p_bet_id;

    -- Credit user balance - return to same balance type as bet was made from
    IF COALESCE(v_bet.is_bonus, FALSE) = TRUE THEN
        UPDATE users
        SET bonus_balance = bonus_balance + p_win_amount
        WHERE id = v_bet.user_id;
    ELSE
        UPDATE users
        SET balance = balance + p_win_amount
        WHERE id = v_bet.user_id;
    END IF;

    -- Return new total balance
    SELECT balance + bonus_balance INTO v_current_balance FROM users WHERE id = v_bet.user_id;
    
    RETURN jsonb_build_object('success', true, 'new_balance', v_current_balance);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
