-- Check and update existing estimations table for planning poker voting
-- Run this script to ensure the table is compatible with the new voting system

-- First, check the current structure
SELECT 'Current estimations table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'estimations' 
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 'Current constraints:' as info;
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'estimations';

-- Add missing columns if they don't exist
ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS backlog_item_id UUID;

ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure value column can store text (for T-shirt sizes)
-- Handle potential type conversion issues
DO $$
BEGIN
    -- Try to alter the column type
    ALTER TABLE estimations ALTER COLUMN value TYPE TEXT;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not alter value column type: %', SQLERRM;
END $$;

-- Add foreign key constraint for backlog_item_id if it doesn't exist
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estimations_backlog_item_id_fkey' 
        AND table_name = 'estimations'
    ) THEN
        ALTER TABLE estimations 
        ADD CONSTRAINT estimations_backlog_item_id_fkey 
        FOREIGN KEY (backlog_item_id) REFERENCES backlog_items(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add backlog_item_id foreign key: %', SQLERRM;
END $$;

-- Add unique constraint if it doesn't exist
-- Handle potential type mismatches with explicit casting
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estimations_unique_vote' 
        AND table_name = 'estimations'
    ) THEN
        -- Try to add the unique constraint
        ALTER TABLE estimations 
        ADD CONSTRAINT estimations_unique_vote 
        UNIQUE(session_id, backlog_item_id, user_id);
        RAISE NOTICE 'Added unique constraint estimations_unique_vote';
    ELSE
        RAISE NOTICE 'Unique constraint estimations_unique_vote already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
        -- Try to identify the issue by checking column types
        RAISE NOTICE 'Checking column types...';
        PERFORM column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'estimations' AND column_name IN ('session_id', 'backlog_item_id', 'user_id');
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_estimations_session_item 
ON estimations(session_id, backlog_item_id);

CREATE INDEX IF NOT EXISTS idx_estimations_user 
ON estimations(user_id);

-- Enable RLS if not already enabled
ALTER TABLE estimations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can read estimations in their sessions" ON estimations;
DROP POLICY IF EXISTS "Users can insert their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can update their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can delete their own estimations" ON estimations;

-- Create policies
CREATE POLICY "Users can read estimations in their sessions" ON estimations
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM planning_sessions 
            WHERE is_active = true
        )
    );

CREATE POLICY "Users can insert their own estimations" ON estimations
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own estimations" ON estimations
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete their own estimations" ON estimations
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Create or replace the trigger function for updated_at
CREATE OR REPLACE FUNCTION update_estimations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_estimations_updated_at ON estimations;
CREATE TRIGGER update_estimations_updated_at
    BEFORE UPDATE ON estimations
    FOR EACH ROW
    EXECUTE FUNCTION update_estimations_updated_at();
