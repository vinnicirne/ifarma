-- CRIAR USUÁRIO ADMIN DO ZERO
-- Este será o usuário que acessa o dashboard /admin

-- 1. Primeiro, crie o usuário no Supabase Auth manualmente:
-- Vá em: Authentication → Users → Add User
-- Email: admin@ifarma.com
-- Password: Admin@123 (ou outra senha forte)
-- Confirme o email automaticamente

-- 2. Depois, execute este SQL para criar o perfil ADMIN:
INSERT INTO profiles (id, email, full_name, role, phone)
VALUES (
    'COLE_O_UUID_DO_USUARIO_CRIADO_AQUI', -- Pegue o ID do usuário criado no passo 1
    'admin@ifarma.com',
    'Administrador do Sistema',
    'admin',
    '(00) 0000-0000'
);

-- 3. Verificar
SELECT id, email, role, full_name
FROM profiles
WHERE role = 'admin';
