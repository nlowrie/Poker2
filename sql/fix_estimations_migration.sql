-- Migration script to update existing estimations table
-- Based on current structure: issue_id (UUID), user_id (TEXT), value (integer)
-- Target structure: backlog_item_id (UUID), user_id (UUID), value (TEXT)

-- Step 1: Add the new backlog_item_id column
ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS backlog_item_id UUID;

-- Step 2: Copy data from issue_id to backlog_item_id with UUID casting
-- Since issue_id contains valid UUID strings, we can safely cast them
UPDATE estimations 
SET backlog_item_id = issue_id::uuid 
WHERE backlog_item_id IS NULL AND issue_id IS NOT NULL;

-- Step 3: Add updated_at column
ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 4: Update existing rows with current timestamp for updated_at
UPDATE estimations 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Step 5: Change value column to TEXT to support T-shirt sizes
ALTER TABLE estimations 
ALTER COLUMN value TYPE TEXT;

-- Step 6: We need to handle the user_id type mismatch
-- Option A: Keep user_id as TEXT (simpler, but less ideal)
-- Option B: Convert to UUID (more complex, requires mapping)

-- For now, let's keep user_id as TEXT and update our application code
-- to handle this difference

-- Step 7: Add unique constraint with the current structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estimations_unique_vote' 
        AND table_name = 'estimations'
    ) THEN
        -- Use the existing columns for uniqueness
        ALTER TABLE estimations 
        ADD CONSTRAINT estimations_unique_vote 
        UNIQUE(session_id, backlog_item_id, user_id);
        
        RAISE NOTICE 'Added unique constraint successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_estimations_session_item 
ON estimations(session_id, backlog_item_id);

CREATE INDEX IF NOT EXISTS idx_estimations_user 
ON estimations(user_id);

-- Step 9: Add foreign key constraint for backlog_item_id
-- (Make sure backlog_items table exists first)
DO $$
BEGIN
    ALTER TABLE estimations 
    ADD CONSTRAINT fk_estimations_backlog_item 
    FOREIGN KEY (backlog_item_id) REFERENCES backlog_items(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for backlog_item_id';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
        RAISE NOTICE 'Make sure backlog_items table exists';
END $$;

-- Step 10: Enable RLS
ALTER TABLE estimations ENABLE ROW LEVEL SECURITY;

-- Step 11: Create policies (accounting for TEXT user_id)
DROP POLICY IF EXISTS "Users can read estimations in their sessions" ON estimations;
DROP POLICY IF EXISTS "Users can insert their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can update their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can delete their own estimations" ON estimations;

-- Create new policies with TEXT user_id comparison
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

-- Step 13: Clean up duplicate data if any exists
-- Remove older duplicates, keep the most recent one
DELETE FROM estimations a USING estimations b
WHERE a.created_at < b.created_at
  AND a.session_id = b.session_id
  AND a.backlog_item_id = b.backlog_item_id
  AND a.user_id = b.user_id;

-- Show final structure
SELECT 'Migration completed. Updated table structure:' as status;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;
