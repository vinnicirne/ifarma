-- ============================================================================
-- MIGRATION: Add Unique Constraint to Pharmacy Subscriptions (SAFE VERSION)
-- Description: Ensures only one LIVE subscription record per pharmacy.
-- ============================================================================

BEGIN;

-- 1) Marcar duplicatas como canceladas (em vez de deletar) para preservar histórico
WITH ranked_subs AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY pharmacy_id ORDER BY created_at DESC) as rn
    FROM public.pharmacy_subscriptions
    WHERE status IN ('active', 'pending_asaas', 'overdue')
)
UPDATE public.pharmacy_subscriptions
SET status = 'canceled',
    canceled_at = NOW(),
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM ranked_subs WHERE rn > 1
);

-- 2) Adicionar índice UNIQUE PARCIAL
-- Isso garante que uma farmácia não tenha duas assinaturas "vivas",
-- mas permite que ela tenha várias assinaturas "canceladas" (histórico).
DROP INDEX IF EXISTS uniq_active_subscription_per_pharmacy;
CREATE UNIQUE INDEX uniq_active_subscription_per_pharmacy
ON public.pharmacy_subscriptions (pharmacy_id)
WHERE (status IN ('active', 'pending_asaas', 'overdue'));

COMMIT;
