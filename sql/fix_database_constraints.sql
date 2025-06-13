-- Diagnose and fix the estimations table issues
-- This script will check the current state and fix the constraints

-- Step 1: Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;

-- Step 2: Check existing constraints
SELECT 
    constraint_name, 
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'estimations';

-- Step 3: Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'estimations';

-- Step 4: Drop existing problematic constraints if they exist
DO $$
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estimations_unique_vote' 
        AND table_name = 'estimations'
    ) THEN
        ALTER TABLE estimations DROP CONSTRAINT estimations_unique_vote;
        RAISE NOTICE 'Dropped existing unique constraint';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not drop constraint: %', SQLERRM;
END $$;

-- Step 5: Ensure all required columns exist
ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS backlog_item_id UUID;

ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 6: Update value column to TEXT
ALTER TABLE estimations 
ALTER COLUMN value TYPE TEXT;

-- Step 7: Update backlog_item_id from issue_id if needed
UPDATE estimations 
SET backlog_item_id = issue_id::uuid 
WHERE backlog_item_id IS NULL AND issue_id IS NOT NULL;

-- Step 8: Add the unique constraint with correct column names
ALTER TABLE estimations 
ADD CONSTRAINT estimations_unique_vote 
UNIQUE(session_id, backlog_item_id, user_id);

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimations_session_item 
ON estimations(session_id, backlog_item_id);

CREATE INDEX IF NOT EXISTS idx_estimations_user 
ON estimations(user_id);

-- Step 10: Add foreign key constraint
DO $$
BEGIN
    ALTER TABLE estimations 
    ADD CONSTRAINT fk_estimations_backlog_item 
    FOREIGN KEY (backlog_item_id) REFERENCES backlog_items(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for backlog_item_id';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
END $$;

-- Step 11: Update RLS policies
DROP POLICY IF EXISTS "Users can read estimations in their sessions" ON estimations;
DROP POLICY IF EXISTS "Users can insert their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can update their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can delete their own estimations" ON estimations;

-- Enable RLS
ALTER TABLE estimations ENABLE ROW LEVEL SECURITY;

-- Create policies with proper user_id handling
CREATE POLICY "Users can read estimations in their sessions" ON estimations
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM planning_sessions 
            WHERE is_active = true
        )
    );

CREATE POLICY "Users can insert their own estimations" ON estimations
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id
    );

CREATE POLICY "Users can update their own estimations" ON estimations
    FOR UPDATE USING (
        auth.uid()::text = user_id
    );

CREATE POLICY "Users can delete their own estimations" ON estimations
    FOR DELETE USING (
        auth.uid()::text = user_id
    );

-- Step 12: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_estimations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_estimations_updated_at ON estimations;
CREATE TRIGGER update_estimations_updated_at
    BEFORE UPDATE ON estimations
    FOR EACH ROW
    EXECUTE FUNCTION update_estimations_updated_at();

-- Step 13: Show final structure
SELECT 'Database migration completed successfully!' as status;

-- Show the current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;

-- Show constraints
SELECT 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'estimations';
