-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    username TEXT,
    content TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read chat_messages" ON chat_messages FOR SELECT USING (true);

-- Allow authenticated users to insert messages
-- We check they only insert their own wallet/user_id, or we just rely on an Edge Function if we want strict enforcement.
-- For a chat, direct insert is often okay if we restrict the user_id matching the authenticated session, but since we use a custom auth/wallet system without Supabase Auth tokens, we might need a permissive policy or route it through an Edge Function.
-- To maintain UI responsiveness without Edge Function overhead for every message, we can allow public inserts for now (since anyone can see the chat anyway), but in a real prod env, we'd sign messages or use Edge Functions to prevent impersonation.
CREATE POLICY "Allow public insert chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);

-- Deny updates/deletes
CREATE POLICY "Deny update chat_messages" ON chat_messages FOR UPDATE USING (false);
CREATE POLICY "Deny delete chat_messages" ON chat_messages FOR DELETE USING (false);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
