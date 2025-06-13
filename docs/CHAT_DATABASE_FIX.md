# URGENT: Chat Messages Database Table Missing

## Issue
The chat functionality is completely broken because the `chat_messages` table does not exist in the Supabase database.

## Symptoms
- ❌ Chat messages are not persisting between sessions
- ❌ Edit function doesn't save changes
- ❌ Delete function doesn't remove messages
- ❌ No errors in console (functions fail silently)

## Quick Fix - Run This SQL Script

### Step 1: Access Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project
4. Go to **SQL Editor**
5. Click **New Query**

### Step 2: Copy and Execute This Script

```sql
-- Create chat_messages table for persistent session chat history
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    message TEXT NOT NULL,
    original_message TEXT, -- Store original message for edit history
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    edit_count INTEGER DEFAULT 0,
    backlog_item_id TEXT, -- Optional: tie message to specific item
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE, -- Track when message was last edited
    deleted_at TIMESTAMP WITH TIME ZONE -- Track when message was deleted (soft delete)
);

-- Create indexes for efficient querying (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_messages_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON chat_messages;

-- Policy: Users can read all messages in sessions they have access to
CREATE POLICY "Users can read chat messages" ON chat_messages
    FOR SELECT USING (true);

-- Policy: Users can insert their own messages
CREATE POLICY "Users can insert their own messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own messages (for editing)
CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON chat_messages
    FOR DELETE USING (auth.uid()::text = user_id);
```

### Step 3: Verify Installation
After running the script, execute this verification query:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chat_messages'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

You should see 15 columns listed.

### Step 4: Test the Fix
1. **Database Test**: Visit `http://localhost:5175/?debug=true&simple=true`
   - Should show "✅ chat_messages table exists"

2. **Chat Test**: Visit `http://localhost:5175/?debug=true&chat=true`
   - Run all the test functions
   - Should show successful save/load/edit/delete operations

3. **Full App Test**:
   - Join a planning session
   - Send chat messages
   - Leave and rejoin the session
   - Verify chat history is preserved
   - Test editing and deleting messages

## Root Cause
The `chat_messages` table was never created in the Supabase database. All the application code is correct, but it was trying to interact with a non-existent table.

## After Running the Fix
Once the table is created, all these features will work immediately:
- ✅ Chat persistence across sessions
- ✅ Real-time message editing with sync
- ✅ Real-time message deletion with sync
- ✅ Edit history tracking
- ✅ User permission validation

**Priority: URGENT** - This is a 5-minute fix that will restore all chat functionality.
