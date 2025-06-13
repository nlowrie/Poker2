-- Fix missing columns in chat_messages table
-- Run this in your Supabase SQL Editor

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add original_message column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'original_message'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN original_message TEXT;
    END IF;

    -- Add deleted_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add is_edited column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'is_edited'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add is_deleted column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add edit_count column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'edit_count'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN edit_count INTEGER DEFAULT 0;
    END IF;

    -- Add edited_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'edited_at'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;
