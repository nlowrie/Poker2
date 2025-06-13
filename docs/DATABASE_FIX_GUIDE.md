# Database Issue Fix Guide

## Problem Summary
The voting system is failing because of database constraint and table structure issues. The main errors are:
1. **NOT NULL Constraint Error**: "null value in column 'issue_id' of relation 'estimations' violates not-null constraint"
2. **Constraint Error**: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
3. **Join Error**: Issues with the `user_profiles` table relationship
4. **HTTP 400/406 Errors**: Database queries failing due to missing constraints and relationships

## Root Cause
The `estimations` table has a NOT NULL constraint on the `issue_id` column, but our updated code is trying to use `backlog_item_id` instead. The table schema needs to be updated to handle the new column structure properly.

## Fix Instructions

### Step 1: Run Complete Database Migration in Supabase SQL Editor

⚠️ **IMPORTANT**: Use the new comprehensive migration script for better results.

Go to your Supabase project → SQL Editor → New Query, and run this script from the file `complete_estimations_fix.sql`:

```sql
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

-- Continue with the rest of the script from complete_estimations_fix.sql
```

**Or simply copy and run the entire contents of:** `sql/complete_estimations_fix.sql`

```sql
-- Fix the estimations table structure and constraints
-- Step 1: Ensure all required columns exist
ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS backlog_item_id UUID;

ALTER TABLE estimations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Update backlog_item_id from issue_id if needed
UPDATE estimations 
SET backlog_item_id = issue_id::uuid 
WHERE backlog_item_id IS NULL AND issue_id IS NOT NULL;

-- Step 3: Change value column to TEXT (for T-shirt sizes)
ALTER TABLE estimations 
ALTER COLUMN value TYPE TEXT;

-- Step 4: Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estimations_unique_vote' 
        AND table_name = 'estimations'
    ) THEN
        ALTER TABLE estimations DROP CONSTRAINT estimations_unique_vote;
    END IF;
END $$;

-- Step 5: Add the correct unique constraint
ALTER TABLE estimations 
ADD CONSTRAINT estimations_unique_vote 
UNIQUE(session_id, backlog_item_id, user_id);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimations_session_item 
ON estimations(session_id, backlog_item_id);

CREATE INDEX IF NOT EXISTS idx_estimations_user 
ON estimations(user_id);

-- Step 7: Ensure RLS is properly configured
ALTER TABLE estimations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
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

-- Step 8: Create updated_at trigger
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
```

### Step 2: Verify the Fix

After running the migration, you can test it by visiting:
`http://localhost:5176/?debug=true`

This will show a database test component that will verify:
- ✅ All tables are accessible
- ✅ Estimation insert/update operations work
- ✅ Join queries with user_profiles work
- ✅ All constraints are properly configured

### Step 3: Test the Voting System

1. **Normal Flow**: Go to `http://localhost:5176`
2. **Sign up/Login** as different users (Team Member and Moderator)
3. **Create a Planning Session** with the Moderator account
4. **Add Backlog Items** to the session
5. **Start Voting** and test:
   - Team members can select estimates
   - Votes are saved and appear in real-time
   - Users can change their votes
   - Moderator sees all votes update instantly

## Code Changes Made

### 1. Fixed `submitEstimation` Function
- Changed from `upsert` with `onConflict` to explicit insert/update logic
- Better error handling for constraint issues
- Proper handling of TEXT values

### 2. Improved `getEstimationsForItem` Function
- Added fallback for when user_profiles join fails
- Better error handling and logging
- Graceful degradation when relationships are missing

### 3. Enhanced VotingSession Component
- Better loading states and error handling
- Improved user feedback during vote submission
- Enhanced real-time notifications
- Better handling of missing user profile data

### 4. Added Database Test Component
- Comprehensive testing of all database operations
- Available at `?debug=true` URL parameter
- Tests table structure, constraints, and relationships

## Expected Results After Fix

✅ **Vote Submission**: Team members can select estimates without errors
✅ **Real-time Updates**: Votes appear instantly for all participants  
✅ **Vote Changes**: Users can change votes with immediate sync
✅ **Data Persistence**: Votes are properly saved to database
✅ **Error Handling**: Graceful error messages instead of crashes
✅ **Multi-user Testing**: Multiple users can vote simultaneously

## Troubleshooting

If you still see errors after running the migration:

1. **Check Supabase Logs**: Go to Supabase → Logs → API to see detailed error messages
2. **Verify RLS Policies**: Make sure Row Level Security policies allow your operations
3. **Test Database Connectivity**: Use the debug URL to run database tests
4. **Check User Profiles**: Ensure `user_profiles` table exists and has proper relationships

The voting system should now work perfectly with real-time collaboration!
