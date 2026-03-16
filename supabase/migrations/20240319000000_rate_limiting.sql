-- Rate Limiting System
-- This migration adds rate limiting functionality to prevent abuse

-- Table to track API requests per user
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(48) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_address, endpoint, window_start)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_wallet 
    ON api_rate_limits(wallet_address, endpoint, window_start DESC);

-- Function to check and increment rate limit
-- Returns true if request is allowed, false if rate limited
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
    
    -- If no record or count is below limit, allow request
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

-- Function to get current rate limit status
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

-- Cleanup old rate limit records (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS VOID AS $$
BEGIN
    DELETE FROM api_rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON api_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION get_rate_limit_status TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits TO service_role;
