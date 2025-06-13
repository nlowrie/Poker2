-- Detailed diagnostic for estimations table structure and data
-- This will show us exactly what columns exist and their types

-- 1. Show complete table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;

-- 2. Show sample data with column types
SELECT 
    session_id,
    pg_typeof(session_id) as session_id_type,
    user_id,
    pg_typeof(user_id) as user_id_type,
    value,
    pg_typeof(value) as value_type,
    created_at,
    pg_typeof(created_at) as created_at_type
FROM estimations 
LIMIT 3;

-- 3. Check if backlog_item_id column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'estimations' 
    AND column_name = 'backlog_item_id'
) as backlog_item_id_exists;

-- 4. Check existing constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'estimations';

-- 5. Show actual sample data to understand the format
SELECT * FROM estimations LIMIT 3;
