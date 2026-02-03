-- ATUALIZAÇÃO CADASTRO PRODUTOS (SKU/EAN)
-- Rode no SQL Editor do Supabase

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS ean TEXT;

CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
