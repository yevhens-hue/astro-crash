-- Create chat_reactions table for message reactions (likes, emojis)
CREATE TABLE IF NOT EXISTS chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, wallet_address, emoji)
);

-- Enable RLS
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read chat_reactions" ON chat_reactions FOR SELECT USING (true);

-- Allow authenticated users to insert reactions
CREATE POLICY "Allow public insert chat_reactions" ON chat_reactions FOR INSERT WITH CHECK (true);

-- Allow users to delete their own reactions
CREATE POLICY "Allow delete own chat_reactions" ON chat_reactions FOR DELETE USING (wallet_address = CURRENT_USER);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_id ON chat_reactions(message_id);
