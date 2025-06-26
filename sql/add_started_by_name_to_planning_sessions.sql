-- Add started_by_name column to planning_sessions for storing the creator's display name
ALTER TABLE planning_sessions 
ADD COLUMN IF NOT EXISTS started_by_name VARCHAR(255);

-- Documentation: This migration allows the frontend and backend to store and retrieve the session creator's display name for all planning sessions.
