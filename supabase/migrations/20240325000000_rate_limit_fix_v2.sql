-- Fix Rate Limiting Bug (v2)
-- The previous implementation had an off-by-one error in the rate limit check
-- This caused users to be rate limited after 9 requests instead of 10

-- Fix the check_rate_limit function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_wallet_address VARCHAR(48),
    p_endpoint VARCHAR(100),
    p_limit INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    -- Get current window start (truncated to second)
    v_window_start := date_trunc('second', NOW());
    
    -- Check if there's an existing record for this user/endpoint/window
    SELECT request_count INTO v_current_count
    FROM api_rate_limits
    WHERE wallet_address = p_wallet_address
      AND endpoint = p_endpoint
      AND window_start >= v_window_start - (p_window_seconds || ' seconds')::INTERVAL
    ORDER BY window_start DESC
    LIMIT 1;
    
    -- If no record or count is STRICTLY LESS THAN limit, allow request
    -- Since we increment the count inside this block, we must check < p_limit
    IF v_current_count IS NULL OR v_current_count < p_limit THEN
        -- Insert or update the rate limit record
        INSERT INTO api_rate_limits (wallet_address, endpoint, request_count, window_start)
        VALUES (p_wallet_address, p_endpoint, 1, v_window_start)
        ON CONFLICT (wallet_address, endpoint, window_start) 
        DO UPDATE SET request_count = api_rate_limits.request_count + 1;
        
        RETURN TRUE;
    END IF;
    
    -- Rate limit exceeded
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Also fix get_rate_limit_status to be consistent
CREATE OR REPLACE FUNCTION get_rate_limit_status(
    p_wallet_address VARCHAR(48),
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
    -- Calculate remaining requests directly without adding 1 (since it's < p_limit)
    v_remaining := GREATEST(0, p_limit - v_current_count);

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION get_rate_limit_status TO service_role;

-- Log that the fix was applied
DO $$
BEGIN
    RAISE NOTICE 'Rate limiting bug fix applied: users can now make full limit requests';
END $$;
