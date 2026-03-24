-- Fix wallet address length constraints for rate limiting system
-- TON raw addresses can be 66+ characters, while bounceable are 48 chars.

-- 1. Alter the table column type
ALTER TABLE api_rate_limits 
ALTER COLUMN wallet_address TYPE VARCHAR(100);

-- 2. Replace the check function to accept longer addresses
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_wallet_address VARCHAR(100),
    p_endpoint VARCHAR(100),
    p_limit INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := date_trunc('second', NOW());
    
    SELECT request_count INTO v_current_count
    FROM api_rate_limits
    WHERE wallet_address = p_wallet_address
      AND endpoint = p_endpoint
      AND window_start >= v_window_start - (p_window_seconds || ' seconds')::INTERVAL
    ORDER BY window_start DESC
    LIMIT 1;
    
    IF v_current_count IS NULL OR v_current_count <= p_limit THEN
        INSERT INTO api_rate_limits (wallet_address, endpoint, request_count, window_start)
        VALUES (p_wallet_address, p_endpoint, 1, v_window_start)
        ON CONFLICT (wallet_address, endpoint, window_start) 
        DO UPDATE SET request_count = api_rate_limits.request_count + 1;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 3. Replace the status function to accept longer addresses
CREATE OR REPLACE FUNCTION get_rate_limit_status(
    p_wallet_address VARCHAR(100),
    p_endpoint VARCHAR(100),
    p_limit INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSONB AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMPTZ;
    v_remaining INTEGER;
    v_reset_time TIMESTAMPTZ;
BEGIN
    v_window_start := date_trunc('second', NOW());
    
    SELECT 
        COALESCE(request_count, 0),
        window_start
    INTO 
        v_current_count,
        v_reset_time
    FROM api_rate_limits
    WHERE wallet_address = p_wallet_address
      AND endpoint = p_endpoint
      AND window_start >= v_window_start - (p_window_seconds || ' seconds')::INTERVAL
    ORDER BY window_start DESC
    LIMIT 1;
    
    v_current_count := COALESCE(v_current_count, 0);
    v_remaining := GREATEST(0, p_limit - v_current_count + 1);
    
    IF v_reset_time IS NULL THEN
        v_reset_time := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;
    END IF;
    
    RETURN JSONB_BUILD_OBJECT(
        'allowed', v_current_count < p_limit,
        'limit', p_limit,
        'remaining', v_remaining,
        'reset_at', v_reset_time
    );
END;
$$ LANGUAGE plpgsql;
