-- Create Messages Table for Encrypted Chat
-- Run this in Supabase SQL Editor

-- Create messages table with encryption fields
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Encrypted message data (hybrid encryption: RSA + AES)
    encrypted_aes_key TEXT NOT NULL,  -- AES key encrypted with recipient's RSA public key
    iv TEXT NOT NULL,                 -- Initialization vector for AES-GCM
    encrypted_data TEXT NOT NULL,     -- Actual message encrypted with AES
    
    -- Metadata
    message_type TEXT DEFAULT 'text', -- 'text' or 'file'
    file_name TEXT,                   -- For file messages
    file_size BIGINT,                 -- For file messages
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;

-- Policy: Users can view their sent and received messages
CREATE POLICY "Users can view their messages"
    ON public.messages 
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can send messages
CREATE POLICY "Users can send messages"
    ON public.messages 
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can update messages they received (for read status)
CREATE POLICY "Users can update their messages"
    ON public.messages 
    FOR UPDATE
    USING (auth.uid() = receiver_id);

-- Add comments
COMMENT ON TABLE messages IS 'Stores end-to-end encrypted messages using hybrid encryption (RSA + AES)';
COMMENT ON COLUMN messages.encrypted_aes_key IS 'AES key encrypted with recipient RSA public key';
COMMENT ON COLUMN messages.iv IS 'Initialization vector for AES-GCM encryption';
COMMENT ON COLUMN messages.encrypted_data IS 'Message content encrypted with AES-GCM';
COMMENT ON COLUMN messages.message_type IS 'Type of message: text or file';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(sender_id, receiver_id, created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_messages_updated_at ON public.messages;
CREATE TRIGGER set_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_messages_updated_at();

-- Verify table creation
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Test query (should return empty result)
SELECT COUNT(*) as total_messages FROM public.messages;

-- Done! Messages table is ready for use
