-- SQL to create the backlog_items table
-- Run this in your Supabase SQL editor

create table if not exists backlog_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority text check (priority in ('Low', 'Medium', 'High', 'Critical')) default 'Medium',
  status text check (status in ('Pending', 'Estimated', 'Skipped')) default 'Pending',
  story_points text,
  estimation_type text,
  acceptance_criteria text[],
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Create indexes for better query performance
create index if not exists idx_backlog_items_status on backlog_items(status);
create index if not exists idx_backlog_items_priority on backlog_items(priority);

-- Create a trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language 'plpgsql';

-- Drop trigger if it exists, then create it
drop trigger if exists update_backlog_items_updated_at on backlog_items;
create trigger update_backlog_items_updated_at before update
  on backlog_items for each row execute procedure update_updated_at_column();
