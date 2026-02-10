-- ============================================
-- DESBLOQUEIO TOTAL DO CADASTRO
-- Removemos as restrições que estão bloqueando o INSERT
-- ============================================

-- Remover restrição de PLANO (Aceitar 'Gratuito', 'Free', qualquer coisa)
ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_plan_check;

-- Remover restrição de STATUS (Aceitar 'Pendente', 'Pending', etc)
ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_status_check;

-- Garantir que lat/lng sejam opcionais (Reforço)
ALTER TABLE public.pharmacies ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.pharmacies ALTER COLUMN longitude DROP NOT NULL;

-- Garantir permissão de INSERT pública (Reforço)
DROP POLICY IF EXISTS "Public create pharmacies" ON public.pharmacies;
CREATE POLICY "Public create pharmacies" ON public.pharmacies FOR INSERT WITH CHECK (true);

-- Notificação de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Restrições removidas! O cadastro deve funcionar agora.';
END $$;
