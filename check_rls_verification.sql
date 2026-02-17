-- check_rls_active.sql
SELECT 
    tablename, 
    rowsecurity 
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename IN ('profiles', 'pharmacies', 'products', 'orders');

SELECT 
    tablename, 
    policyname, 
    cmd, 
    roles 
FROM 
    pg_policies 
WHERE 
    schemaname = 'public' 
    AND tablename IN ('profiles', 'pharmacies', 'products', 'orders')
ORDER BY 
    tablename, policyname;
