-- Quick diagnostic to see issue_id format
SELECT 
    issue_id,
    pg_typeof(issue_id) as issue_id_type,
    length(issue_id) as issue_id_length,
    -- Try to check if it looks like a UUID
    CASE 
        WHEN issue_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'Valid UUID format'
        ELSE 'Not UUID format'
    END as uuid_check
FROM estimations 
LIMIT 5;
