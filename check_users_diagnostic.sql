-- check_users_structure_and_policies.sql
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'users';

SELECT * FROM pg_policies WHERE tablename = 'users';

-- Check for any roles enum or table if exists (guessing common names)
SELECT * FROM pg_roles; -- This checks database roles, not application roles
-- Check if there's a roles table
SELECT tablename FROM pg_tables WHERE tablename LIKE '%role%';
