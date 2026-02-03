-- ============================================
-- FIX: NOTIFICAÇÕES E DEVICE TOKENS
-- DATA: 2026-02-01
-- ============================================

-- 1. DEVICE TOKENS: Adicionar Constraint UNIQUE (Necessário para upsert funcionarem)
-- Primeiro, removemos duplicatas se existirem para aplicar a constraint
DELETE FROM device_tokens a USING device_tokens b
WHERE a.id < b.id AND a.user_id = b.user_id AND a.token = b.token;

-- Adiciona a constraint se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_tokens_user_id_token_key') THEN
        ALTER TABLE device_tokens ADD CONSTRAINT device_tokens_user_id_token_key UNIQUE (user_id, token);
        RAISE NOTICE 'Constraint UNIQUE adicionada em device_tokens.';
    END IF;
END $$;

-- 2. DEVICE TOKENS: RLS Policies
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own device tokens" ON device_tokens;

CREATE POLICY "Users can manage own device tokens"
ON device_tokens FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. NOTIFICATIONS: RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications; -- Para marcar como lida

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Grants
GRANT ALL ON device_tokens TO authenticated;
GRANT ALL ON notifications TO authenticated;

DO $$
BEGIN
    RAISE NOTICE 'Permissões e Constraints de Notificações corrigidas.';
END $$;
