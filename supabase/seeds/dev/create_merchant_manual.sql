-- ============================================
-- CRIAR USUÁRIO MERCHANT MANUALMENTE
-- ============================================

-- PASSO 1: Criar usuário no Supabase Dashboard
-- Vá em: Authentication > Users > Add User
-- Email: teste@teste.com
-- Password: 123456
-- Auto Confirm User: YES ✅
-- Copie o UUID gerado após criar

-- PASSO 2: Pegar o UUID da farmácia
SELECT id, name FROM pharmacies WHERE name LIKE '%TESTE%';
-- Copie o UUID da farmácia

-- PASSO 3: Inserir perfil merchant (substitua os UUIDs)
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    phone,
    pharmacy_id,
    created_at
) VALUES (
    'COLE_UUID_DO_AUTH_USERS_AQUI',  -- UUID do usuário criado no passo 1
    'teste@teste.com',
    'Administrador Teste',
    'merchant',
    '(11) 99999-9999',
    'COLE_UUID_DA_FARMACIA_AQUI',    -- UUID da farmácia do passo 2
    NOW()
);

-- PASSO 4: Verificar se foi criado
SELECT p.*, ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
WHERE p.email = 'teste@teste.com';
