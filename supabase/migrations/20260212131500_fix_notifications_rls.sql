-- ============================================
-- FIX RLS: notifications
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Usuários podem ver suas próprias notificações
DROP POLICY IF EXISTS "User view own notifications" ON public.notifications;
CREATE POLICY "User view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Staff (Admins, Operadores) podem ver todas as notificações
DROP POLICY IF EXISTS "Staff view all notifications" ON public.notifications;
CREATE POLICY "Staff view all notifications" ON public.notifications
    FOR SELECT USING (public.is_staff());

-- 3. Staff podem inserir notificações para qualquer usuário (Envio de Push/Avisos)
DROP POLICY IF EXISTS "Staff insert notifications" ON public.notifications;
CREATE POLICY "Staff insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (public.is_staff());

-- 4. Usuários podem marcar suas notificações como lidas (Update no campo read_at)
DROP POLICY IF EXISTS "User update own notifications" ON public.notifications;
CREATE POLICY "User update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Staff podem gerenciar (deletar) notificações se necessário
DROP POLICY IF EXISTS "Staff manage notifications" ON public.notifications;
CREATE POLICY "Staff manage notifications" ON public.notifications
    FOR DELETE USING (public.is_staff());
