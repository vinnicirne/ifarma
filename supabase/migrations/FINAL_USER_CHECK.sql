-- VERIFICAÇÃO FINAL: O usuário existe no auth.users?

-- 1. Buscar TODOS os usuários recentes
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Buscar especificamente o usuário problemático
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users
WHERE email = 'comercialfaum@gmail.com';

-- 3. Buscar pelo ID exato
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE id = '71e592fa-822a-41eb-8764-478445285eff';
