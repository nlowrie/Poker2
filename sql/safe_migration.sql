-- Safe migration script for estimations table
-- This handles type mismatches and existing data carefully

-- Step 1: Add missing columns with safe defaults
ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS backlog_item_id UUID;

ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Ensure value column can handle text
-- Check current type first, then alter if needed
DO $$
BEGIN
    -- Try to alter the column type
    ALTER TABLE estimations ALTER COLUMN value TYPE TEXT;
EXCEPTION
    WHEN others THEN
        -- If it fails, the column might already be text or have data that can't convert
        RAISE NOTICE 'Could not change value column type: %', SQLERRM;
END $$;

-- Step 3: Update existing rows to have proper backlog_item_id if null
-- This is a placeholder - you might need to map existing data based on your business logic
-- UPDATE estimations 
-- SET backlog_item_id = (SELECT id FROM backlog_items LIMIT 1)
-- WHERE backlog_item_id IS NULL;

-- Step 4: Add foreign key constraint for backlog_item_id (only if column has data)
-- ALTER TABLE estimations 
-- ADD CONSTRAINT fk_estimations_backlog_item 
-- FOREIGN KEY (backlog_item_id) REFERENCES backlog_items(id) ON DELETE CASCADE;

-- Step 5: Try to add unique constraint with explicit casting
DO $$
BEGIN
    -- First, let's see what data types we're working with
    -- and add unique constraint accordingly
    
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estimations_unique_vote' 
        AND table_name = 'estimations'
    ) THEN
        -- Try to add the constraint
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
        RAISE NOTICE 'This might be due to existing duplicate data or type mismatches';
END $$;

-- Step 6: Create indexes safely
CREATE INDEX IF NOT EXISTS idx_estimations_session_item 
ON estimations(session_id, backlog_item_id);

CREATE INDEX IF NOT EXISTS idx_estimations_user 
ON estimations(user_id);

-- Step 7: Enable RLS
ALTER TABLE estimations ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can read estimations in their sessions" ON estimations;
DROP POLICY IF EXISTS "Users can insert their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can update their own estimations" ON estimations;
DROP POLICY IF EXISTS "Users can delete their own estimations" ON estimations;

-- Create new policies
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

-- Step 9: Create trigger function and trigger
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

-- Step 10: Show final structure
SELECT 'Migration completed. Current table structure:' as status;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'estimations'
ORDER BY ordinal_position;
