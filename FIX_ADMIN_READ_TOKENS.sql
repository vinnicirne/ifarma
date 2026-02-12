-- ============================================
-- CORREÇÃO: Permitir que ADMINS leiam tokens de todos
-- ============================================

-- 1. Dropar a política de leitura antiga
DROP POLICY IF EXISTS "Leitura de tokens" ON device_tokens;

-- 2. Criar nova política que permite:
--    a) O próprio usuário ler seu token
--    b) Service Role (backend) ler tudo
--    c) Usuários que são ADMINS na tabela profiles lerem tudo

CREATE POLICY "Leitura de tokens" ON device_tokens
    FOR SELECT USING (
        auth.uid() = user_id 
        OR 
        auth.jwt() ->> 'role' = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin' -- ou 'gestor' dependendo da sua regra
        )
    );
