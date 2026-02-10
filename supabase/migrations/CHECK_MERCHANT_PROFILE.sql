-- Verificar se o usuário merchant foi criado sem perfil
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    p.id as profile_id,
    p.role,
    p.pharmacy_id
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email = 'comercialfaum@gmail.com'
ORDER BY au.created_at DESC;

-- Se o perfil não existir, criar manualmente:
-- INSERT INTO profiles (id, email, full_name, role, pharmacy_id)
-- VALUES (
--     'COLE_O_ID_DO_AUTH_USER_AQUI',
--     'comercialfaum@gmail.com',
--     'Comercial Farmacia',
--     'merchant',
--     'e09d67f8-e4db-4195-9589-0c9155d4239a'
-- );
