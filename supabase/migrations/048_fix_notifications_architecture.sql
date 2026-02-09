-- Migration unificada para corrigir arquitetura de notificações e permissões
-- Autor: Database Architect Agent

BEGIN;

-- 1. Tabela device_tokens (Tokens FCM)
ALTER TABLE IF EXISTS public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Admins podem fazer TUDO em device_tokens (ver, limpar inválidos)
DROP POLICY IF EXISTS "Admins full access to device_tokens" ON public.device_tokens;
CREATE POLICY "Admins full access to device_tokens"
ON public.device_tokens
FOR ALL
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Usuários podem gerenciar seus PRÓPRIOS tokens
DROP POLICY IF EXISTS "Users manage own device_tokens" ON public.device_tokens;
CREATE POLICY "Users manage own device_tokens"
ON public.device_tokens
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 2. Tabela notifications (Histórico para o usuário)
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins podem INSERIR notificações para qualquer usuário (Envio de broadcast)
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Usuários só veem suas próprias notificações
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuários podem marcar suas notificações como lidas (UPDATE)
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 3. Tabela system_alerts (Alertas globais/admin)
-- Criar se não existir, pois apareceu erro de violação nela
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, warning, error, success
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Admins veem e gerenciam todos os alertas
DROP POLICY IF EXISTS "Admins manage system_alerts" ON public.system_alerts;
CREATE POLICY "Admins manage system_alerts"
ON public.system_alerts
FOR ALL
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Permite inserção por funções de sistema (service_role) ou triggers
-- (Geralmente coberto por bypass RLS do service_role, mas se for via client admin, a policy acima cobre)

COMMIT;
