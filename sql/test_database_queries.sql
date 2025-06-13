-- Simple test queries to verify database setup
-- Run these in your Supabase SQL editor

-- 1. Check if estimations table exists and its structure
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;

-- 2. Check constraints on estimations table
SELECT 
    constraint_name, 
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'estimations';

-- 3. Test inserting a sample estimation (replace with real IDs)
-- First, let's see what sessions and items exist:
SELECT id, name FROM planning_sessions LIMIT 3;
SELECT id, title FROM backlog_items LIMIT 3;

-- 4. Check user_profiles table
SELECT 
    table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 5. Test a simple estimation insert (replace UUIDs with real ones from your data):
/*
INSERT INTO estimations (session_id, backlog_item_id, user_id, value) 
VALUES (
    'YOUR_SESSION_ID', 
    'YOUR_BACKLOG_ITEM_ID', 
    'YOUR_USER_ID', 
    '5'
) 
ON CONFLICT (session_id, backlog_item_id, user_id) 
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
*/

-- 6. Test querying estimations with user profiles
SELECT 
    e.*,
    up.full_name,
    up.role
FROM estimations e
LEFT JOIN user_profiles up ON e.user_id = up.id::text
LIMIT 5;
