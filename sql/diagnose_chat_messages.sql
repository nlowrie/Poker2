-- Diagnostic script to check chat_messages table
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'chat_messages';

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'chat_messages'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any chat messages
SELECT COUNT(*) as total_messages FROM chat_messages;

-- Check recent messages (if any)
SELECT id, session_id, user_name, message, created_at, is_edited, is_deleted
FROM chat_messages
ORDER BY created_at DESC
LIMIT 10;
