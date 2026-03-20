-- 0. Cleanup existing negative balances to allow constraint creation
UPDATE users SET balance = 0 WHERE balance < 0;
UPDATE users SET bonus_balance = 0 WHERE bonus_balance < 0;

-- 1. Add constraints to prevent negative balances
ALTER TABLE users ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);
ALTER TABLE users ADD CONSTRAINT check_bonus_non_negative CHECK (bonus_balance >= 0);

-- Add minimum withdrawal constraint to transactions
ALTER TABLE transactions ADD CONSTRAINT check_withdrawal_minimum CHECK (type != 'withdrawal' OR amount >= 0.5);

-- 2. Atomic function for placing a bet with balance validation
CREATE OR REPLACE FUNCTION place_bet_atomic(
    p_user_address TEXT,
    p_round_id UUID,
    p_amount DECIMAL,
    p_is_bonus BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $
DECLARE
    v_user_id UUID;
    v_current_balance DECIMAL;
    v_current_bonus DECIMAL;
    v_total_available DECIMAL;
    v_new_bet_id UUID;
    v_use_bonus BOOLEAN;
BEGIN
    -- Get user and lock the row for update to prevent race conditions
    SELECT id, balance, bonus_balance
    INTO v_user_id, v_current_balance, v_current_bonus
    FROM users
    WHERE wallet_address = p_user_address
    FOR UPDATE;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Calculate total available balance (real + bonus)
    v_total_available := COALESCE(v_current_balance, 0) + COALESCE(v_current_bonus, 0);
    
    -- Check if user has enough total balance
    IF v_total_available < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Determine which balance to use
    -- If p_is_bonus is true, use bonus balance
    -- Otherwise, use real balance first, then bonus if needed
    IF p_is_bonus THEN
        -- User specifically requested bonus balance
        IF COALESCE(v_current_bonus, 0) < p_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Insufficient bonus balance');
        END IF;
        UPDATE users SET bonus_balance = bonus_balance - p_amount WHERE id = v_user_id;
    ELSE
        -- Use real balance first
        IF COALESCE(v_current_balance, 0) >= p_amount THEN
            UPDATE users SET balance = balance - p_amount WHERE id = v_user_id;
        ELSE
            -- Not enough real balance, use bonus to cover the difference
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
    END IF;

    -- Record the bet
    INSERT INTO bets (user_id, round_id, amount, status, is_bonus)
    VALUES (v_user_id, p_round_id, p_amount, 'confirmed', p_is_bonus)
    RETURNING id INTO v_new_bet_id;

    -- Return new total balance
    SELECT balance + bonus_balance INTO v_total_available FROM users WHERE id = v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'bet_id', v_new_bet_id,
        'new_balance', v_total_available
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic function for Slot Spin (deduct + payout)
CREATE OR REPLACE FUNCTION spin_slot_atomic(
    p_user_address TEXT,
    p_cost DECIMAL,
    p_win_amount DECIMAL,
    p_is_bonus BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $
DECLARE
    v_user_id UUID;
    v_current_balance DECIMAL;
    v_current_bonus DECIMAL;
    v_total_available DECIMAL;
    v_net_change DECIMAL;
BEGIN
    -- Get user and lock
    SELECT id, balance, bonus_balance
    INTO v_user_id, v_current_balance, v_current_bonus
    FROM users
    WHERE wallet_address = p_user_address
    FOR UPDATE;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Calculate total available balance
    v_total_available := COALESCE(v_current_balance, 0) + COALESCE(v_current_bonus, 0);
    
    -- Check if user has enough total balance
    IF v_total_available < p_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    v_net_change := p_win_amount - p_cost;

    -- Update balance - use real first, then bonus if needed
    IF p_is_bonus THEN
        -- Using bonus balance only
        IF COALESCE(v_current_bonus, 0) >= p_cost THEN
            UPDATE users SET bonus_balance = bonus_balance + v_net_change WHERE id = v_user_id;
        ELSE
            -- Not enough bonus, use real + bonus
            DECLARE
                v_remaining DECIMAL;
            BEGIN
                v_remaining := p_cost - COALESCE(v_current_bonus, 0);
                UPDATE users SET 
                    balance = balance - v_remaining,
                    bonus_balance = bonus_balance + v_net_change
                WHERE id = v_user_id;
            END;
        END IF;
    ELSE
        -- Using real balance first
        IF COALESCE(v_current_balance, 0) >= p_cost THEN
            UPDATE users SET balance = balance + v_net_change WHERE id = v_user_id;
        ELSE
            -- Not enough real balance, use bonus to cover difference
            DECLARE
                v_remaining DECIMAL;
            BEGIN
                v_remaining := p_cost - COALESCE(v_current_balance, 0);
                UPDATE users SET 
                    balance = 0,
                    bonus_balance = bonus_balance - v_remaining + v_net_change
                WHERE id = v_user_id;
            END;
        END IF;
    END IF;

    -- Return new balance
    SELECT balance + bonus_balance INTO v_total_available FROM users WHERE id = v_user_id;
    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_total_available
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3b. Atomic function for Cashout Bet
CREATE OR REPLACE FUNCTION cashout_bet_atomic(
    p_bet_id UUID,
    p_cashout_at DECIMAL,
    p_win_amount DECIMAL
) RETURNS JSONB AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users Policy: Can only see their own profile
CREATE POLICY user_read_own ON users 
FOR SELECT USING (wallet_address = (current_setting('request.headers', true)::jsonb->>'x-wallet-address'));

-- Bets Policy: Can only see their own bets
-- Note: Requires a way to identify the user's wallet_address in the policy.
CREATE POLICY bets_read_own ON bets
FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = (current_setting('request.headers', true)::jsonb->>'x-wallet-address')));

CREATE POLICY slots_read_own ON slot_spins
FOR SELECT USING (wallet_address = (current_setting('request.headers', true)::jsonb->>'x-wallet-address'));

-- Chat Policy: Anyone can read, only authenticated can write
CREATE POLICY chat_read_all ON chat_messages FOR SELECT USING (true);

-- 5. Additional Atomic Functions

-- 5a. Atomic function for Cashout Bet
CREATE OR REPLACE FUNCTION cashout_bet_atomic(
    p_bet_id UUID,
    p_cashout_at DECIMAL,
    p_win_amount DECIMAL
) RETURNS JSONB AS $
DECLARE
    v_bet RECORD;
    v_user RECORD;
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

    -- Credit user balance
    UPDATE users
    SET balance = balance + p_win_amount
    WHERE id = v_bet.user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5b. Atomic function for incrementing user balance (for payouts)
CREATE OR REPLACE FUNCTION increment_user_balance(
    p_wallet_address TEXT,
    p_amount DECIMAL
) RETURNS BOOLEAN AS $
BEGIN
    UPDATE users
    SET balance = balance + p_amount
    WHERE wallet_address = p_wallet_address;
    
    RETURN FOUND;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
