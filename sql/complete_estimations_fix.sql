-- Complete fix for estimations table schema issues
-- This addresses the specific "null value in column issue_id" error

-- Step 1: Check current table structure first
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;

-- Step 2: Drop NOT NULL constraint from issue_id if it exists
ALTER TABLE estimations 
ALTER COLUMN issue_id DROP NOT NULL;

-- Step 3: Add backlog_item_id column if it doesn't exist
ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS backlog_item_id UUID;

-- Step 4: Update existing records - copy issue_id to backlog_item_id
UPDATE estimations 
SET backlog_item_id = issue_id::uuid 
WHERE backlog_item_id IS NULL AND issue_id IS NOT NULL;

-- Step 5: For new records, make backlog_item_id the primary reference
-- We'll keep issue_id for backward compatibility but allow it to be NULL

-- Step 6: Change value column to TEXT (for T-shirt sizes)
ALTER TABLE estimations 
ALTER COLUMN value TYPE TEXT;

-- Step 7: Add updated_at column
ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows with timestamp
UPDATE estimations 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Step 8: Drop old unique constraint if it exists
DO $$
BEGIN
    -- Drop any existing constraints that might conflict
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estimations_unique_vote' 
        AND table_name = 'estimations'
    ) THEN
        ALTER TABLE estimations DROP CONSTRAINT estimations_unique_vote;
        RAISE NOTICE 'Dropped existing unique constraint';
    END IF;
    
    -- Also check for other unique constraints that might exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%estimations%unique%' 
        AND table_name = 'estimations'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- Get the constraint name and drop it
        DECLARE 
            constraint_name_var text;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%estimations%unique%' 
            AND table_name = 'estimations'
            AND constraint_type = 'UNIQUE'
            LIMIT 1;
            
            EXECUTE 'ALTER TABLE estimations DROP CONSTRAINT ' || constraint_name_var;
            RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
        END;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not drop constraints: %', SQLERRM;
END $$;

-- Step 9: Create new unique constraint using backlog_item_id
ALTER TABLE estimations 
ADD CONSTRAINT estimations_session_item_user_unique 
UNIQUE(session_id, backlog_item_id, user_id);

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimations_session_backlog 
ON estimations(session_id, backlog_item_id);

CREATE INDEX IF NOT EXISTS idx_estimations_user_id 
ON estimations(user_id);

CREATE INDEX IF NOT EXISTS idx_estimations_backlog_item 
ON estimations(backlog_item_id);

-- Step 11: Add foreign key constraint for backlog_item_id
DO $$
BEGIN
    -- First check if backlog_items table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backlog_items') THEN
        ALTER TABLE estimations 
        ADD CONSTRAINT fk_estimations_backlog_item 
        FOREIGN KEY (backlog_item_id) REFERENCES backlog_items(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for backlog_item_id';
    ELSE
        RAISE NOTICE 'backlog_items table does not exist, skipping foreign key constraint';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key constraint already exists';
    WHEN others THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
END $$;

-- Step 12: Configure Row Level Security
ALTER TABLE estimations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read estimations in their sessions" ON estimations;
DROP POLICY IF EXISTS "Users can insert their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can update their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can delete their own estimations" ON estimations;

-- Create comprehensive RLS policies
CREATE POLICY "Users can read estimations in their sessions" ON estimations
    FOR SELECT USING (
        -- Allow users to read estimations for active sessions
        session_id IN (
            SELECT id FROM planning_sessions 
            WHERE is_active = true
        )
    );

CREATE POLICY "Users can insert their own estimations" ON estimations
    FOR INSERT WITH CHECK (
        -- Users can only insert estimations for themselves
        auth.uid()::text = user_id
        AND session_id IN (
            SELECT id FROM planning_sessions 
            WHERE is_active = true
        )
    );

CREATE POLICY "Users can update their own estimations" ON estimations
    FOR UPDATE USING (
        -- Users can only update their own estimations
        auth.uid()::text = user_id
    );

CREATE POLICY "Users can delete their own estimations" ON estimations
    FOR DELETE USING (
        -- Users can only delete their own estimations
        auth.uid()::text = user_id
    );

-- Step 13: Create/update the updated_at trigger
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

-- Step 14: Test the schema
-- Insert a test record to verify everything works
DO $$
DECLARE
    test_session_id UUID;
    test_item_id UUID;
    test_user_id TEXT := 'test-user-123';
BEGIN
    -- Get a real session and item ID if they exist
    SELECT id INTO test_session_id FROM planning_sessions LIMIT 1;
    SELECT id INTO test_item_id FROM backlog_items LIMIT 1;
    
    IF test_session_id IS NOT NULL AND test_item_id IS NOT NULL THEN
        -- Try to insert a test estimation
        INSERT INTO estimations (session_id, backlog_item_id, user_id, value) 
        VALUES (test_session_id, test_item_id, test_user_id, '5')
        ON CONFLICT (session_id, backlog_item_id, user_id) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        
        -- Clean up test record
        DELETE FROM estimations 
        WHERE session_id = test_session_id 
        AND backlog_item_id = test_item_id 
        AND user_id = test_user_id;
        
        RAISE NOTICE 'Schema test passed successfully!';
    ELSE
        RAISE NOTICE 'Cannot test schema - no planning sessions or backlog items found';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Schema test failed: %', SQLERRM;
END $$;

-- Step 15: Show final table structure
SELECT 'Migration completed! Final table structure:' as message;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;

SELECT 'Constraints:' as message;
SELECT 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'estimations'
ORDER BY constraint_type, constraint_name;
