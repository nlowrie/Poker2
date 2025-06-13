-- Migration script to fix session_items table and establish foreign key relationship
-- Run this in your Supabase SQL editor

-- Step 1: Drop the existing session_items table (this will remove existing data)
DROP TABLE IF EXISTS session_items;

-- Step 2: Recreate the session_items table with proper foreign key relationships
CREATE TABLE session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references planning_sessions(id) on delete cascade,
  item_id uuid references backlog_items(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(session_id, item_id)
);

-- Step 3: Create indexes for better query performance
CREATE INDEX idx_session_items_session_id ON session_items(session_id);
CREATE INDEX idx_session_items_item_id ON session_items(item_id);

-- Step 4: Verify the foreign key constraints were created
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='session_items';

-- You should see two rows showing the foreign key relationships
