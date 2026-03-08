-- Deposits Table to track TON inflows
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    wallet_address TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    tx_hash TEXT UNIQUE NOT NULL, -- Unique constraint to prevent double-crediting
    status TEXT DEFAULT 'pending', -- pending, confirmed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);
