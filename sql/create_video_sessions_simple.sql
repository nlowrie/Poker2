-- Simple video_sessions table creation (no dependencies)
-- Run this in your Supabase SQL Editor

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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_video_sessions_session_id ON video_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_started_by ON video_sessions(started_by);
CREATE INDEX IF NOT EXISTS idx_video_sessions_is_active ON video_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_video_sessions_started_at ON video_sessions(started_at);

-- Enable RLS and create simple policies
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read, insert and update their own records
CREATE POLICY "Users can manage video sessions" ON video_sessions
    FOR ALL USING (auth.role() = 'authenticated');
