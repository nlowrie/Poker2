# Database Setup Instructions

## Missing video_sessions Table

The application is failing because the `video_sessions` table doesn't exist in your Supabase database. Here's how to fix it:

### Option 1: Run SQL in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com/project/bvmzmcptcypyojzmuanf
2. Navigate to the "SQL Editor" section
3. **Use the simplified version**: Copy and paste the contents of `sql/create_video_sessions_simple.sql` into the SQL editor
4. Run the SQL query

### Option 2: Use the Complete Version (Advanced)

If you want the full version with detailed RLS policies, use `sql/create_video_sessions_table.sql` (now fixed to work without session_participants table)

### Quick Fix SQL

You can also copy this SQL directly into Supabase:

```sql
CREATE TABLE IF NOT EXISTS video_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    started_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    participants_count INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_session_id ON video_sessions(session_id);
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage video sessions" ON video_sessions
    FOR ALL USING (auth.role() = 'authenticated');
```

### What This Table Does

The `video_sessions` table tracks:
- Active video calls in planning sessions
- Who started each call
- When calls were started/ended
- Number of participants

### Temporary Fix Applied

I've already applied a temporary fix to the code that makes the video functionality work even without the database table. The app will:
- Show warnings in the console instead of errors
- Continue to function normally for video calls
- Use real-time broadcasting for video call state (which works without the database)

### After Creating the Table

Once you create the table, the app will:
- Store video session records in the database
- Track call history
- Provide better persistence for video call state
- Show fewer warnings in the console

## Other Fixed Issues

1. **Fixed NavigationControls Error**: Commented out undefined `NavigationControls` component
2. **Fixed TimerDisplay Error**: Already commented out in previous sessions
3. **Added Graceful Error Handling**: Video calls now work even without database tracking

The application should now load without runtime errors!
