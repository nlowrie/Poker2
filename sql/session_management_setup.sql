-- Add status column to planning_sessions table for session management
ALTER TABLE planning_sessions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add ended_at column to track when sessions end
ALTER TABLE planning_sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;

-- Add summary column to store session summary as JSON
ALTER TABLE planning_sessions 
ADD COLUMN IF NOT EXISTS summary JSONB;

-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_planning_sessions_status ON planning_sessions(status);

-- Create session_history table for storing completed session summaries
CREATE TABLE IF NOT EXISTS session_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES planning_sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    total_votes INTEGER DEFAULT 0,
    consensus_reached BOOLEAN DEFAULT false,
    participants JSONB DEFAULT '[]',
    stories JSONB DEFAULT '[]',
    average_voting_time INTEGER DEFAULT 0, -- in seconds
    created_by UUID NOT NULL,
    room_code VARCHAR(10),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for session_history
CREATE INDEX IF NOT EXISTS idx_session_history_session_id ON session_history(session_id);
CREATE INDEX IF NOT EXISTS idx_session_history_created_by ON session_history(created_by);
CREATE INDEX IF NOT EXISTS idx_session_history_end_time ON session_history(end_time DESC);

-- Update existing sessions to have 'active' status
UPDATE planning_sessions 
SET status = 'active' 
WHERE is_active = true AND status IS NULL;

-- Update existing sessions to have 'completed' status  
UPDATE planning_sessions 
SET status = 'completed' 
WHERE is_active = false AND status IS NULL;
