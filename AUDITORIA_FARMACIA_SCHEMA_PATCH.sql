-- =====================================================
-- IFARMA - PATCH AUDITORIA SCHEMA FARMÁCIA
-- Descrição: Correção de colunas faltantes e recarga de cache
-- =====================================================

BEGIN;

-- 1. Garantir coluna establishment_phone (Telefone Fixo)
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS establishment_phone TEXT;

-- 2. Garantir coluna auto_open_status (Automação de Horários)
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS auto_open_status BOOLEAN DEFAULT false;

-- 3. Garantir colunas de horários legadas/específicas se necessário (Opcional, mas preventivo)
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS opening_hours_start TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS opening_hours_end TEXT;

-- 4. Notificar recarga de schema (PostgREST Cache)
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Comentário de Auditoria
COMMENT ON COLUMN public.pharmacies.establishment_phone IS 'Telefone fixo da unidade (Auditoria 2026)';
COMMENT ON COLUMN public.pharmacies.auto_open_status IS 'Status de abertura automática via scheduler (Auditoria 2026)';
