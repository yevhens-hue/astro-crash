-- Create anti-fraud logs table
CREATE TABLE IF NOT EXISTS fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'bet_pattern', 'win_pattern', 'deposit_pattern', 'withdrawal_pattern',
        'session_anomaly', 'multiaccount', 'bonus_abuse', 'collusion', 'other'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    evidence JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT false,
    resolved_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fraud rules table
CREATE TABLE IF NOT EXISTS fraud_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    conditions JSONB NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('log', 'warn', 'block', 'review')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read fraud_logs" ON fraud_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert fraud_logs" ON fraud_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update fraud_logs" ON fraud_logs FOR UPDATE USING (true);

CREATE POLICY "Allow public read fraud_rules" ON fraud_rules FOR SELECT USING (true);
CREATE POLICY "Allow public insert fraud_rules" ON fraud_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update fraud_rules" ON fraud_rules FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fraud_logs_wallet ON fraud_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_severity ON fraud_logs(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_created_at ON fraud_logs(created_at);

-- Insert default fraud rules
INSERT INTO fraud_rules (name, description, event_type, conditions, action) VALUES
    ('High Win Rate', 'Flag users with unusually high win rates', 'win_pattern', 
     '{"min_win_rate": 70, "min_bets": 50, "timeframe_hours": 24}', 'warn'),
    ('Bonus Abuse', 'Detect bonus abuse patterns', 'bonus_abuse',
     '{"max_bonus_claims": 3, "timeframe_hours": 24}', 'block'),
    ('Unusual Bet Size', 'Flag unusually large bets compared to balance', 'bet_pattern',
     '{"max_bet_to_balance_ratio": 0.5}', 'log'),
    ('Multiple Accounts', 'Detect potential multi-accounting', 'multiaccount',
     '{"same_ip_threshold": 3, "same_device_threshold": 3}', 'review'),
    ('Rapid Betting', 'Detect bot-like rapid betting', 'bet_pattern',
     '{"max_bets_per_minute": 10}', 'warn')
ON CONFLICT DO NOTHING;

-- Function to check and log fraud
CREATE OR REPLACE FUNCTION check_fraud(
    p_wallet_address TEXT,
    p_event_type TEXT,
    p_severity TEXT,
    p_description TEXT,
    p_evidence JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO fraud_logs (wallet_address, event_type, severity, description, evidence)
    VALUES (p_wallet_address, p_event_type, p_severity, p_description, p_evidence)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function to get user's fraud score
CREATE OR REPLACE FUNCTION get_fraud_score(p_wallet_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_high_count INTEGER;
    v_critical_count INTEGER;
    v_total_count INTEGER;
    v_score INTEGER := 0;
BEGIN
    SELECT COUNT(*), SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END), COUNT(*)
    INTO v_total_count, v_critical_count, v_total_count
    FROM fraud_logs
    WHERE wallet_address = p_wallet_address
    AND NOT is_resolved
    AND created_at > NOW() - INTERVAL '30 days';
    
    -- Calculate score
    v_score := v_score + (v_critical_count * 50);
    v_score := v_score + (v_high_count * 20);
    v_score := v_score + (v_total_count * 5);
    v_score := LEAST(v_score, 100); -- Cap at 100
    
    RETURN jsonb_build_object(
        'score', v_score,
        'critical_count', v_critical_count,
        'high_count', v_high_count,
        'total_count', v_total_count,
        'risk_level', CASE 
            WHEN v_score >= 80 THEN 'critical'
            WHEN v_score >= 50 THEN 'high'
            WHEN v_score >= 20 THEN 'medium'
            ELSE 'low'
        END
    );
END;
$$;
