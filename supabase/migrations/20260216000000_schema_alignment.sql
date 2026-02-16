-- ============================================================================
-- ALINHAMENTO DE SCHEMA: Adiciona colunas faltantes para compatibilidade
-- Execute esta migração se encontrar erros PGRST204 (coluna não encontrada)
-- ============================================================================

BEGIN;

-- PHARMACIES: colunas que o frontend espera
ALTER TABLE public.pharmacies
    ADD COLUMN IF NOT EXISTS establishment_phone TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS zip TEXT,
    ADD COLUMN IF NOT EXISTS street TEXT,
    ADD COLUMN IF NOT EXISTS number TEXT,
    ADD COLUMN IF NOT EXISTS neighborhood TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS complement TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS banner_url TEXT,
    ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0,
    ADD COLUMN IF NOT EXISTS delivery_fee_type TEXT DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS delivery_fee_fixed NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_fee_per_km NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_ranges JSONB,
    ADD COLUMN IF NOT EXISTS delivery_free_min_km NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS delivery_free_min_value NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS delivery_max_km NUMERIC DEFAULT 15,
    ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC DEFAULT 15,
    ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS allows_pickup BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- PRODUCTS: colunas do catálogo avançado
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS dosage TEXT,
    ADD COLUMN IF NOT EXISTS quantity_label TEXT,
    ADD COLUMN IF NOT EXISTS principle_active TEXT[],
    ADD COLUMN IF NOT EXISTS tags TEXT[],
    ADD COLUMN IF NOT EXISTS synonyms TEXT[],
    ADD COLUMN IF NOT EXISTS control_level TEXT,
    ADD COLUMN IF NOT EXISTS usage_instructions TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Sincronizar promo_price com promotional_price se existir
UPDATE public.products SET promo_price = promotional_price WHERE promo_price IS NULL AND promotional_price IS NOT NULL;

COMMIT;
