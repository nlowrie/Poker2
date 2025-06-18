-- Clean setup for video_sessions table
-- This version handles existing policies and constraints

-- Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Authenticated users can view video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Authenticated users can create video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Users can update video sessions they started" ON video_sessions;

-- Drop table if it exists (optional - uncomment if you want to start fresh)
-- DROP TABLE IF EXISTS video_sessions;

-- Create table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS video_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    started_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    participants_count INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes (ignore if they already exist)
CREATE INDEX IF NOT EXISTS idx_video_sessions_session_id ON video_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_started_by ON video_sessions(started_by);
CREATE INDEX IF NOT EXISTS idx_video_sessions_is_active ON video_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_video_sessions_started_at ON video_sessions(started_at);

-- Enable RLS
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- Create fresh policies
CREATE POLICY "Authenticated users can view video sessions" ON video_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create video sessions" ON video_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = started_by AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update video sessions they started" ON video_sessions
    FOR UPDATE USING (auth.uid() = started_by) 
    WITH CHECK (auth.uid() = started_by);

-- Success message
SELECT 'video_sessions table setup complete!' as status;
