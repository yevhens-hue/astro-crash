CREATE OR REPLACE FUNCTION cashout_bet_atomic(
    p_bet_id UUID,
    p_cashout_at DECIMAL,
    p_win_amount DECIMAL
) RETURNS JSONB AS $$
DECLARE
    v_bet RECORD;
    v_user RECORD;
    v_new_balance DECIMAL;
    v_new_bonus DECIMAL;
BEGIN
    SELECT * INTO v_bet FROM bets WHERE id = p_bet_id FOR UPDATE;
    IF v_bet IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Bet not found'); END IF;
    IF v_bet.status != 'confirmed' THEN RETURN jsonb_build_object('success', false, 'error', 'Bet not active'); END IF;

    SELECT * INTO v_user FROM users WHERE id = v_bet.user_id FOR UPDATE;
    IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User not found'); END IF;

    UPDATE bets SET status = 'cashed', cashout_at = p_cashout_at, win_amount = p_win_amount WHERE id = p_bet_id;

    IF COALESCE(v_bet.is_bonus, FALSE) = TRUE THEN
        UPDATE users SET bonus_balance = bonus_balance + p_win_amount WHERE id = v_bet.user_id;
    ELSE
        UPDATE users SET balance = balance + p_win_amount WHERE id = v_bet.user_id;
    END IF;

    SELECT balance, bonus_balance INTO v_new_balance, v_new_bonus FROM users WHERE id = v_bet.user_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'new_bonus', v_new_bonus
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
