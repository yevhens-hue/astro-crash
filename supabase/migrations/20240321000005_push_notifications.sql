-- Create push_subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bonus', 'reward', 'withdrawal', 'deposit', 'system', 'leaderboard', 'promotion')),
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for push_subscriptions
CREATE POLICY "Allow public read push_subscriptions" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow owner insert push_subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (wallet_address = current_user);
CREATE POLICY "Allow owner delete push_subscriptions" ON push_subscriptions FOR DELETE USING (wallet_address = current_user);

-- Policies for notifications
CREATE POLICY "Allow public read own notifications" ON notifications FOR SELECT USING (wallet_address = current_user);
CREATE POLICY "Allow public insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update own notifications" ON notifications FOR UPDATE USING (wallet_address = current_user);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_wallet ON push_subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
