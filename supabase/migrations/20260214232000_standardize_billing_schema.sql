-- ============================================================================
-- MIGRATION: Standardize Billing Schema & Fix Constraints
-- Description: Ensures all necessary columns exist, fixes data inconsistencies,
--              and enforces unique active subscription per pharmacy.
-- ============================================================================

BEGIN;

-- 1) Garantir colunas necessárias em pharmacy_subscriptions
ALTER TABLE public.pharmacy_subscriptions
  ADD COLUMN IF NOT EXISTS next_billing_date DATE,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS asaas_last_error TEXT,
  ADD COLUMN IF NOT EXISTS asaas_updated_at TIMESTAMPTZ;

-- 2) Trigger simples para updated_at (se você não tiver)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pharmacy_subscriptions_updated_at ON public.pharmacy_subscriptions;
CREATE TRIGGER trg_pharmacy_subscriptions_updated_at
BEFORE UPDATE ON public.pharmacy_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Normalizar "cancelamento": se ended_at estiver preenchido e canceled_at estiver null, copia
UPDATE public.pharmacy_subscriptions
SET canceled_at = COALESCE(canceled_at, ended_at)
WHERE status = 'canceled';

-- 4) “Limpar duplicadas ativas” antes do índice único (se tiver)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY pharmacy_id ORDER BY started_at DESC NULLS LAST, created_at DESC) AS rn
  FROM public.pharmacy_subscriptions
  WHERE status = 'active'
)
UPDATE public.pharmacy_subscriptions ps
SET status = 'canceled',
    canceled_at = NOW(),
    ended_at = NOW()
FROM ranked r
WHERE ps.id = r.id
  AND r.rn > 1;

-- 5) Enforce: apenas 1 assinatura ACTIVE por pharmacy
DROP INDEX IF EXISTS uniq_active_subscription_per_pharmacy;
CREATE UNIQUE INDEX uniq_active_subscription_per_pharmacy
ON public.pharmacy_subscriptions (pharmacy_id)
WHERE status = 'active';

-- 6) Enforce: apenas 1 ciclo por mês por farmácia (recomendado)
DROP INDEX IF EXISTS uniq_billing_cycle_per_period;
CREATE UNIQUE INDEX uniq_billing_cycle_per_period
ON public.billing_cycles (pharmacy_id, period_start);

COMMIT;
