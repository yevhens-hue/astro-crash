-- Migration: Add Telegram Apps OSINT Analytics Schema
-- Run this in your Supabase SQL editor or via CLI

CREATE TABLE IF NOT EXISTS osint_apps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_username TEXT UNIQUE NOT NULL, -- e.g. "hamster_kombat_bot"
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    blockchain_contract_address TEXT, -- Main TON contract if web3
    channel_username TEXT, -- e.g. "hamster_kombat"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Snapshots to track growth and trends (MAU, DAU, Telegram Members, Revenue)
CREATE TABLE IF NOT EXISTS osint_app_metrics_daily (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    app_id UUID REFERENCES osint_apps(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Telegram Channel Metrics (Proxy for organinc traffic / popularity)
    channel_subscribers BIGINT,
    channel_views_per_post BIGINT,
    
    -- Blockchain Metrics (Proxy for revenue / engaged users)
    ton_volume_in DECIMAL(20, 9), -- Amount of TON deposited
    ton_volume_out DECIMAL(20, 9), -- Amount of TON withdrawn/paid
    active_wallets BIGINT, -- Unique wallets interacting with contract (DAU proxy)
    
    -- Tapps Center Metrics
    tapps_rank INT,
    tapps_likes INT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, date)
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_osint_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_osint_apps_timestamp
BEFORE UPDATE ON osint_apps
FOR EACH ROW
EXECUTE FUNCTION update_osint_apps_updated_at();

-- RLS (Row Level Security) - Admins only
ALTER TABLE osint_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE osint_app_metrics_daily ENABLE ROW LEVEL SECURITY;

-- If you have an admin role or check in your project, add policy:
-- CREATE POLICY "Admins can view OSINT data" ON osint_apps FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
