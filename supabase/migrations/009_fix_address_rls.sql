-- ==========================================================
-- CORREÇÃO: PERMISSÕES DE ENDEREÇOS (user_addresses)
-- O usuário relatou que endereços adicionados não aparecem.
-- Isso geralmente ocorre quando as políticas de segurança (RLS) bloqueiam a leitura.
-- ==========================================================

-- 1. Habilitar RLS (caso não esteja)
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas para evitar conflitos/duplicação
DROP POLICY IF EXISTS "Usuarios podem ver seus proprios enderecos" ON user_addresses;
DROP POLICY IF EXISTS "Usuarios podem inserir seus proprios enderecos" ON user_addresses;
DROP POLICY IF EXISTS "Usuarios podem atualizar seus proprios enderecos" ON user_addresses;
DROP POLICY IF EXISTS "Usuarios podem deletar seus proprios enderecos" ON user_addresses;

-- Compatibilidade com nomes antigos (opcional, para garantir limpeza)
DROP POLICY IF EXISTS "Users can select own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON user_addresses;

-- 3. Criar Políticas Corretas

-- L E I T U R A (SELECT)
CREATE POLICY "Usuarios podem ver seus proprios enderecos"
ON user_addresses FOR SELECT
USING (auth.uid() = user_id);

-- I N S E R Ç Ã O (INSERT)
CREATE POLICY "Usuarios podem criar seus proprios enderecos"
ON user_addresses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- A T U A L I Z A Ç Ã O (UPDATE)
CREATE POLICY "Usuarios podem atualizar seus proprios enderecos"
ON user_addresses FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- E X C L U S Ã O (DELETE)
CREATE POLICY "Usuarios podem deletar seus proprios enderecos"
ON user_addresses FOR DELETE
USING (auth.uid() = user_id);

-- 4. Notificar e Recarregar
NOTIFY pgrst, 'reload config';
