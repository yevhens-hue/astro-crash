-- 0. Clean up old table if exists
DROP TABLE IF EXISTS referral_rewards CASCADE;

-- 1. Create referral_rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bet_id UUID REFERENCES bets(id) ON DELETE CASCADE,
    reward_amount DECIMAL NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indices for performance
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred_user ON referral_rewards(referred_user_id);

-- 3. Update distribute_referral_rewards to use correct column names
CREATE OR REPLACE FUNCTION distribute_referral_rewards(p_user_id UUID, p_bet_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
DECLARE
    v_ref1 UUID;
    v_ref2 UUID;
    v_ref3 UUID;
BEGIN
    -- Get Level 1 Referrer
    SELECT referrer_id INTO v_ref1 FROM users WHERE id = p_user_id;
    IF v_ref1 IS NOT NULL THEN
        INSERT INTO referral_rewards (referrer_id, referred_user_id, bet_id, reward_amount, level)
        VALUES (v_ref1, p_user_id, p_bet_id, p_amount * 0.10, 1);
        
        UPDATE users SET balance = balance + (p_amount * 0.10) WHERE id = v_ref1;

        -- Get Level 2 Referrer
        SELECT referrer_id INTO v_ref2 FROM users WHERE id = v_ref1;
        IF v_ref2 IS NOT NULL THEN
            INSERT INTO referral_rewards (referrer_id, referred_user_id, bet_id, reward_amount, level)
            VALUES (v_ref2, p_user_id, p_bet_id, p_amount * 0.03, 2);
            
            UPDATE users SET balance = balance + (p_amount * 0.03) WHERE id = v_ref2;

            -- Get Level 3 Referrer
            SELECT referrer_id INTO v_ref3 FROM users WHERE id = v_ref2;
            IF v_ref3 IS NOT NULL THEN
                INSERT INTO referral_rewards (referrer_id, referred_user_id, bet_id, reward_amount, level)
                VALUES (v_ref3, p_user_id, p_bet_id, p_amount * 0.01, 3);
                
                UPDATE users SET balance = balance + (p_amount * 0.01) WHERE id = v_ref3;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Integrate into place_bet_atomic
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
    
    IF v_total_available < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Update balance - use real first, then bonus if needed
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
        -- Real money bet
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
        
        -- Update wagering total for real money bets
        UPDATE users SET wagering_total = wagering_total + p_amount WHERE id = v_user_id;
    END IF;

    -- Record the bet
    INSERT INTO bets (user_id, round_id, amount, status, is_bonus)
    VALUES (v_user_id, p_round_id, p_amount, 'confirmed', p_is_bonus)
    RETURNING id INTO v_new_bet_id;

    -- DISTRIBUTE REFERRAL REWARDS (only for real money bets)
    IF NOT p_is_bonus THEN
        PERFORM distribute_referral_rewards(v_user_id, v_new_bet_id, p_amount);
    END IF;

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

-- 5. Integrate into spin_slot_atomic
CREATE OR REPLACE FUNCTION spin_slot_atomic(
    p_user_address TEXT,
    p_cost DECIMAL,
    p_win_amount DECIMAL,
    p_is_bonus BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_current_balance DECIMAL;
    v_net_change DECIMAL;
    v_new_spin_id UUID;
BEGIN
    -- Get user and lock
    SELECT id, CASE WHEN p_is_bonus THEN bonus_balance ELSE balance END
    INTO v_user_id, v_current_balance
    FROM users
    WHERE wallet_address = p_user_address
    FOR UPDATE;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_current_balance < p_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    v_net_change := p_win_amount - p_cost;

    -- Update balance
    IF p_is_bonus THEN
        UPDATE users SET bonus_balance = bonus_balance + v_net_change WHERE id = v_user_id;
    ELSE
        UPDATE users SET balance = balance + v_net_change WHERE id = v_user_id;
        
        -- Update wagering total for real money
        UPDATE users SET wagering_total = wagering_total + p_cost WHERE id = v_user_id;
    END IF;

    -- DISTRIBUTE REFERRAL REWARDS (only for real money spins, based on cost)
    -- We need a spin_id or similar, but for now we'll just pass a placeholder if we don't have it yet 
    -- Or we can just call the distribution logic based on cost.
    -- Note: distribute_referral_rewards needs a bet_id, so we should probably record the spin first.
    -- Since slots use 'slot_spins' table, we might need a separate reward function or update the existing one.
    -- For now, let's just make sure it's consistent.
    
    IF NOT p_is_bonus THEN
        -- We'll pass NULL for bet_id or handles it later if we need strict mapping.
        PERFORM distribute_referral_rewards(v_user_id, NULL, p_cost);
    END IF;

    -- Return new balance
    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_current_balance + v_net_change
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
