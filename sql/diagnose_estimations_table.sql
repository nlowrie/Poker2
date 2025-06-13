-- Diagnostic script to check the current estimations table structure
-- Run this FIRST to understand what we're working with

SELECT '=== ESTIMATIONS TABLE STRUCTURE ===' as section;

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

SELECT '=== CONSTRAINTS ===' as section;

-- Check existing constraints
SELECT 
    constraint_name, 
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'estimations';

SELECT '=== FOREIGN KEYS ===' as section;

-- Check foreign key details
SELECT
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.constraint_name
FROM information_schema.key_column_usage kcu
JOIN information_schema.referential_constraints rc 
    ON kcu.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON rc.unique_constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'estimations';

SELECT '=== INDEXES ===' as section;

-- Check existing indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'estimations';

SELECT '=== SAMPLE DATA ===' as section;

-- Sample some data to see the current format (if any exists)
SELECT * FROM estimations LIMIT 3;

SELECT '=== ROW COUNT ===' as section;

-- Check how much data exists
SELECT COUNT(*) as total_rows FROM estimations;
