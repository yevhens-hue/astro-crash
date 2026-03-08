-- Slot Spins Table
CREATE TABLE IF NOT EXISTS slot_spins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    wallet_address TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    result_symbols TEXT[] NOT NULL,
    win_amount DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, confirmed, paid
    tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
