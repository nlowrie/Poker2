-- Query to check the current structure of the estimations table
-- Run this in Supabase SQL editor to see what exists

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'estimations';

-- Check existing indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'estimations';

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'estimations';

-- Sample some data to see the current format (if any exists)
SELECT * FROM estimations LIMIT 5;
