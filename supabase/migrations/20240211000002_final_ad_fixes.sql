-- ============================================
-- FINAL AD FIXES & FEED POSITIONING
-- ============================================

-- 1. Garantir RLS e permissões na tabela de configurações
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
CREATE POLICY "Enable read access for all users" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.system_settings;
CREATE POLICY "Enable insert for admins only" ON public.system_settings 
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Enable update for admins only" ON public.system_settings;
CREATE POLICY "Enable update for admins only" ON public.system_settings 
FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Mover seção de Destaques para o final do feed (como pedido)
UPDATE public.app_feed_sections SET position = 100 WHERE type = 'pharmacy_list.featured';
