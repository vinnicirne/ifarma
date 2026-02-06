-- Enable Realtime for cart_items table
begin;
  -- Remove existing subscription if any
  -- (Usually handled via dashboard, but we can try via SQL to be sure)
  alter publication supabase_realtime add table cart_items;
commit;
