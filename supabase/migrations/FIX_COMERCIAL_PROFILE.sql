-- CRIAR PERFIL MANUALMENTE PARA O USUÁRIO JÁ CRIADO
-- Este usuário foi criado mas ficou sem perfil por causa do RLS

-- 1. Buscar o ID do usuário no auth.users
SELECT id, email, created_at
FROM auth.users
WHERE email = 'comercialfaum@gmail.com';

-- 2. Criar o perfil (COPIE O ID DO PASSO 1)
INSERT INTO profiles (id, email, full_name, role, pharmacy_id)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'comercialfaum@gmail.com'),
    'comercialfaum@gmail.com',
    'Comercial Farmacia',
    'merchant',
    'e09d67f8-e4db-4195-9589-0c9155d4239a'
);

-- 3. Verificar
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.email = 'comercialfaum@gmail.com';
