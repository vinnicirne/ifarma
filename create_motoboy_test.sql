-- ============================================
-- CRIAR USUÁRIO MOTOBOY DE TESTE
-- ============================================

-- 1. Primeiro, crie o usuário no Supabase Auth (via Dashboard)
-- Email: motoboy@test.com
-- Senha: 123456
-- Copie o UUID gerado

-- 2. Depois execute este SQL substituindo o UUID:

-- Inserir perfil do motoboy
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    phone,
    is_online,
    created_at
) VALUES (
    'COLE_O_UUID_AQUI', -- UUID do auth.users
    'motoboy@test.com',
    'Motoboy Teste',
    'motoboy',
    '(11) 99999-9999',
    false,
    NOW()
);

-- Verificar
SELECT * FROM profiles WHERE role = 'motoboy';

-- ============================================
-- OU FAÇA PELO PAINEL ADMIN:
-- ============================================
-- 1. Faça login como admin
-- 2. Vá em "Gerenciar Motoboys"
-- 3. Clique em "Cadastrar Motoboy"
-- 4. Preencha os dados
-- 5. Faça logout
-- 6. Faça login com o email/senha do motoboy
-- 7. Acesse: http://localhost:5173/motoboy-dashboard
