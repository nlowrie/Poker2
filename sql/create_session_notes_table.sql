-- Create session_notes table for AI-generated summaries
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL, -- Planning session ID
    title TEXT NOT NULL DEFAULT 'Session Notes',
    content TEXT NOT NULL, -- AI-generated summary
    chat_summary TEXT, -- Summary of chat messages
    decision_points JSONB, -- Key decisions made during session
    action_items JSONB, -- Action items identified
    participants JSONB, -- List of session participants
    backlog_items_discussed JSONB, -- Items that were discussed
    estimation_summary JSONB, -- Summary of estimations made
    ai_model TEXT DEFAULT 'gpt-4', -- AI model used for summarization
    generated_by UUID REFERENCES auth.users(id), -- User who generated summary
    is_manual BOOLEAN DEFAULT FALSE, -- Whether manually edited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_created_at ON session_notes(created_at);

-- Add RLS (Row Level Security)
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Policies for session notes
DROP POLICY IF EXISTS "Users can read session notes" ON session_notes;
DROP POLICY IF EXISTS "Users can insert session notes" ON session_notes;
DROP POLICY IF EXISTS "Users can update session notes" ON session_notes;
DROP POLICY IF EXISTS "Users can delete session notes" ON session_notes;

-- Users can read notes for sessions they participated in
CREATE POLICY "Users can read session notes" ON session_notes
FOR SELECT USING (
    session_id IN (
        SELECT session_id FROM chat_messages 
        WHERE user_id = auth.uid()::text
        UNION
        SELECT session_id::text FROM estimations 
        WHERE user_id = auth.uid()
    )
);

-- Users can create session notes
CREATE POLICY "Users can insert session notes" ON session_notes
FOR INSERT WITH CHECK (
    auth.uid() = generated_by
);

-- Users can update notes they created
CREATE POLICY "Users can update session notes" ON session_notes
FOR UPDATE USING (auth.uid() = generated_by)
WITH CHECK (auth.uid() = generated_by);

-- Users can delete notes they created
CREATE POLICY "Users can delete session notes" ON session_notes
FOR DELETE USING (auth.uid() = generated_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_session_notes_updated_at ON session_notes;
CREATE TRIGGER update_session_notes_updated_at
    BEFORE UPDATE ON session_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_session_notes_updated_at();
