-- ============================================
-- VERIFICAR SE USUÁRIO MERCHANT FOI CRIADO
-- ============================================

-- 1. Verificar usuários no auth.users
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'teste@teste.com';

-- 2. Verificar perfil na tabela profiles
SELECT id, email, full_name, role, pharmacy_id
FROM profiles
WHERE email = 'teste@teste.com';

-- 3. Listar todos os merchants
SELECT p.*, ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
WHERE p.role = 'merchant';

-- 4. Se o usuário NÃO foi criado, criar manualmente:
-- IMPORTANTE: Substitua os valores conforme necessário

-- Primeiro, crie o usuário no Supabase Dashboard:
-- Authentication > Users > Add User
-- Email: teste@teste.com
-- Password: 123456
-- Auto Confirm User: YES
-- Copie o UUID gerado

-- Depois, execute este INSERT substituindo o UUID:
/*
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    phone,
    pharmacy_id,
    created_at
) VALUES (
    'COLE_UUID_DO_AUTH_USERS_AQUI',
    'teste@teste.com',
    'Administrador Teste',
    'merchant',
    '(11) 99999-9999',
    (SELECT id FROM pharmacies WHERE name LIKE '%TESTE%' LIMIT 1),
    NOW()
);
*/
