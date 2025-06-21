-- Database Verification Script for Session Analytics
-- Run this to ensure all tables and columns exist for Phase 2 features

-- Check if planning_sessions table has required columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'planning_sessions' 
  AND column_name IN ('status', 'ended_at', 'summary');

-- Check if session_history table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'session_history';

-- Check session_history table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'session_history';

-- Sample query to test completed sessions retrieval
SELECT id, name, status, ended_at, summary
FROM planning_sessions 
WHERE status = 'completed'
ORDER BY ended_at DESC
LIMIT 5;
