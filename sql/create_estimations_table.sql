-- Create estimations table for storing votes
CREATE TABLE IF NOT EXISTS estimations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
    backlog_item_id UUID NOT NULL REFERENCES backlog_items(id) ON DELETE CASCADE,  
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    value TEXT NOT NULL, -- Can be numeric (Fibonacci) or string (T-shirt sizes)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one vote per user per backlog item per session
    UNIQUE(session_id, backlog_item_id, user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_estimations_session_item 
ON estimations(session_id, backlog_item_id);

CREATE INDEX IF NOT EXISTS idx_estimations_user 
ON estimations(user_id);

-- Enable RLS
ALTER TABLE estimations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all estimations in sessions they participate in
CREATE POLICY "Users can read estimations in their sessions" ON estimations
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM planning_sessions 
            WHERE is_active = true
        )
    );

-- Policy: Users can insert their own estimations
CREATE POLICY "Users can insert their own estimations" ON estimations
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Policy: Users can update their own estimations
CREATE POLICY "Users can update their own estimations" ON estimations
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Policy: Users can delete their own estimations  
CREATE POLICY "Users can delete their own estimations" ON estimations
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_estimations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_estimations_updated_at
    BEFORE UPDATE ON estimations
    FOR EACH ROW
    EXECUTE FUNCTION update_estimations_updated_at();
