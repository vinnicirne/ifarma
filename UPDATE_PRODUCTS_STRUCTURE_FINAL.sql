-- ATUALIZACAO COMPLETA DA TABELA PRODUCTS
-- Sincronizando com o frontend InventoryControl.tsx

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS original_price numeric(10,2),
ADD COLUMN IF NOT EXISTS promo_price numeric(10,2), -- Frontend usa promo_price, banco tinha promotional_price. Vamos suportar o frontend.
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS dosage text,
ADD COLUMN IF NOT EXISTS quantity_label text,
ADD COLUMN IF NOT EXISTS principle_active text[],
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS synonyms text[],
ADD COLUMN IF NOT EXISTS control_level text,
ADD COLUMN IF NOT EXISTS usage_instructions text;

-- Sincronizar promotional_price antigo com promo_price novo se necessario (opcional)
-- UPDATE public.products SET promo_price = promotional_price WHERE promo_price IS NULL;

-- Criar indices para performance
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING gin(tags);
