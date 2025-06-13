-- Create video_sessions table to track video conference sessions
CREATE TABLE IF NOT EXISTS video_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL, -- Links to planning session
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

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_video_sessions_updated_at ON video_sessions;
CREATE TRIGGER update_video_sessions_updated_at
    BEFORE UPDATE ON video_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_video_sessions_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view video sessions in their planning sessions" ON video_sessions;
DROP POLICY IF EXISTS "Users can create video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Users can update video sessions they started" ON video_sessions;

-- Policy: Users can view video sessions in planning sessions they participate in
CREATE POLICY "Users can view video sessions in their planning sessions" ON video_sessions
    FOR SELECT USING (
        session_id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can create video sessions in their planning sessions
CREATE POLICY "Users can create video sessions" ON video_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = started_by AND
        session_id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update video sessions they started
CREATE POLICY "Users can update video sessions they started" ON video_sessions
    FOR UPDATE USING (auth.uid() = started_by) 
    WITH CHECK (auth.uid() = started_by);
