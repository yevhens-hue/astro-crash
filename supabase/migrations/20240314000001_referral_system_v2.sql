-- 1. Function to generate a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger to ensure every user has a referral code
CREATE OR REPLACE FUNCTION ensure_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := 'ref_' || generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_referral_code ON users;
CREATE TRIGGER tr_ensure_referral_code
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION ensure_referral_code();

-- 3. Function to link user to a referrer via code
CREATE OR REPLACE FUNCTION link_referrer(p_user_id UUID, p_ref_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
BEGIN
    -- Find referrer by code
    SELECT id INTO v_referrer_id FROM users WHERE referral_code = p_ref_code;
    
    -- If found and not self, link it
    IF v_referrer_id IS NOT NULL AND v_referrer_id != p_user_id THEN
        UPDATE users SET referrer_id = v_referrer_id WHERE id = p_user_id AND referrer_id IS NULL;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to distribute rewards across 3 levels
-- Levels: 1 (10%), 2 (3%), 3 (1%)
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
        INSERT INTO referral_rewards (referrer_id, referee_id, bet_id, amount, level)
        VALUES (v_ref1, p_user_id, p_bet_id, p_amount * 0.10, 1);
        
        UPDATE users SET balance = balance + (p_amount * 0.10) WHERE id = v_ref1;

        -- Get Level 2 Referrer
        SELECT referrer_id INTO v_ref2 FROM users WHERE id = v_ref1;
        IF v_ref2 IS NOT NULL THEN
            INSERT INTO referral_rewards (referrer_id, referee_id, bet_id, amount, level)
            VALUES (v_ref2, p_user_id, p_bet_id, p_amount * 0.03, 2);
            
            UPDATE users SET balance = balance + (p_amount * 0.03) WHERE id = v_ref2;

            -- Get Level 3 Referrer
            SELECT referrer_id INTO v_ref3 FROM users WHERE id = v_ref2;
            IF v_ref3 IS NOT NULL THEN
                INSERT INTO referral_rewards (referrer_id, referee_id, bet_id, amount, level)
                VALUES (v_ref3, p_user_id, p_bet_id, p_amount * 0.01, 3);
                
                UPDATE users SET balance = balance + (p_amount * 0.01) WHERE id = v_ref3;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
