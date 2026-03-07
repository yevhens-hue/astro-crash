-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    balance DECIMAL DEFAULT 0,
    referral_code TEXT UNIQUE,
    referrer_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Rounds Table
CREATE TABLE IF NOT EXISTS rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_seed TEXT NOT NULL,
    crash_point DECIMAL NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, active, finished
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bets Table
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID REFERENCES rounds(id),
    user_id UUID REFERENCES users(id),
    amount DECIMAL NOT NULL,
    multiplier_target DECIMAL,
    cashout_at DECIMAL,
    win_amount DECIMAL,
    status TEXT DEFAULT 'placed', -- placed, cashed, lost, pending_payment
    tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Rewards Table
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES users(id),
    referee_id UUID REFERENCES users(id),
    bet_id UUID REFERENCES bets(id),
    amount DECIMAL NOT NULL,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
