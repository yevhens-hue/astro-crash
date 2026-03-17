-- Add session management columns to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspicious_reason TEXT;

-- Create sessions_log for tracking all session events
CREATE TABLE IF NOT EXISTS sessions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'activity', 'warning', 'suspicious', 'blocked')),
    event_data JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sessions_log ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read sessions_log" ON sessions_log FOR SELECT USING (true);

-- Allow insert for logging
CREATE POLICY "Allow public insert sessions_log" ON sessions_log FOR INSERT WITH CHECK (true);

-- Index for sessions_log
CREATE INDEX IF NOT EXISTS idx_sessions_log_session_id ON sessions_log(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_log_created_at ON sessions_log(created_at);

-- Function to get active session count for a wallet
CREATE OR REPLACE FUNCTION get_active_session_count(p_wallet_address TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM sessions
    WHERE wallet_address = p_wallet_address
    AND is_active = true
    AND last_activity > NOW() - INTERVAL '30 minutes';
    
    RETURN v_count;
END;
$$;

-- Function to log session event
CREATE OR REPLACE FUNCTION log_session_event(
    p_session_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}',
    p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO sessions_log (session_id, event_type, event_data, ip_address)
    VALUES (p_session_id, p_event_type, p_event_data, p_ip_address);
END;
$$;
