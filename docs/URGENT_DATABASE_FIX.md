# URGENT: Database Fix Required for Voting System

## Current Issue
**Error**: `null value in column "issue_id" of relation "estimations" violates not-null constraint`

This is preventing the voting system from working. The database table structure needs to be updated.

## Quick Fix Instructions

### 1. Go to Supabase Dashboard
- Open your Supabase project
- Navigate to **SQL Editor**
- Click **New Query**

### 2. Run the Migration Script
Copy and paste the **ENTIRE contents** of this file into the SQL editor:
```
sql/complete_estimations_fix.sql
```

Then click **Run** to execute the migration.

### 3. Test the Fix
After running the migration:

1. **Test Database**: Visit `http://localhost:5176/?debug=true`
   - This will run comprehensive database tests
   - Should show all green checkmarks ✅

2. **Test Voting**: Go to `http://localhost:5176`
   - Sign in as different users (Moderator and Team Member)
   - Create a planning session
   - Add backlog items
   - Try voting on items
   - Verify votes appear in real-time for all participants

## What the Migration Does

1. **Fixes the NOT NULL constraint** on `issue_id` column
2. **Adds proper `backlog_item_id` column** with correct relationships
3. **Creates unique constraints** needed for vote upsert operations
4. **Sets up proper Row Level Security** policies
5. **Adds performance indexes** for faster queries
6. **Creates compatibility layer** between old and new column names

## Expected Results After Fix

✅ **Vote Submission**: Team members can vote without database errors
✅ **Real-time Updates**: Votes appear instantly for all participants
✅ **Vote Changes**: Users can change votes seamlessly
✅ **Data Persistence**: All votes properly saved to database
✅ **Multi-user Support**: Multiple users can vote simultaneously

## Verification Steps

After running the migration, these should all work:

1. **Create Planning Session** (as Moderator)
2. **Add Backlog Items** to session
3. **Join Session** (as Team Member)
4. **Vote on Items** (Team Member submits estimates)
5. **See Real-time Updates** (Moderator sees votes immediately)
6. **Change Votes** (Team Member can modify their estimates)
7. **Reveal Votes** (Moderator can show all estimates)

If any of these fail, check the browser console for errors and verify the migration ran successfully.

## Need Help?

If the migration fails:
1. Check the **SQL error messages** in Supabase
2. Run the **database test** at `?debug=true` URL
3. Look at **browser console errors** for specific issues
4. Verify your **Supabase project permissions** allow DDL operations

The voting system will work perfectly once this database migration is complete!
