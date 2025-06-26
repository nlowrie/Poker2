-- Add created_by_name column to session_history for storing the creator's display name
ALTER TABLE session_history ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

-- Enable Row Level Security (RLS) on session_history if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = 'session_history'::regclass
    ) THEN
        ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Add SELECT policy for all users if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'session_history' AND policyname = 'Allow select for all users'
    ) THEN
        CREATE POLICY "Allow select for all users" ON session_history
            FOR SELECT USING (true);
    END IF;
END $$;

-- Add INSERT policy for all users if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'session_history' AND policyname = 'Allow insert for all users'
    ) THEN
        CREATE POLICY "Allow insert for all users" ON session_history
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Documentation: The above policies allow all users to SELECT and INSERT on session_history, including the created_by_name field, to support frontend display and session creation. Policies are created conditionally to avoid duplication errors during repeated migrations.