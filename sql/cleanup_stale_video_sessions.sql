-- Clean up stale video sessions
-- Run this in your Supabase SQL Editor to fix any leftover active sessions

-- Mark all video sessions as ended (cleanup)
UPDATE video_sessions 
SET is_active = false, 
    ended_at = NOW() 
WHERE is_active = true;

-- Check what was cleaned up
SELECT 
    session_id,
    started_by,
    started_at,
    ended_at,
    is_active
FROM video_sessions 
ORDER BY started_at DESC 
LIMIT 10;

-- Success message
SELECT 'Stale video sessions cleaned up!' as status;
