-- SQL to create the session_items table
-- Run this in your Supabase SQL editor
-- Make sure to run create_backlog_items_table.sql first!

create table if not exists session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references planning_sessions(id) on delete cascade,
  item_id uuid references backlog_items(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(session_id, item_id)
);

-- Create indexes for better query performance
create index if not exists idx_session_items_session_id on session_items(session_id);
create index if not exists idx_session_items_item_id on session_items(item_id);

-- If you're getting foreign key errors, you may need to recreate the table
-- Uncomment the lines below if needed:
-- DROP TABLE IF EXISTS session_items;
-- Then re-run the CREATE TABLE statement above
