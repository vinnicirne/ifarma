-- ===============================================================
-- CORREÇÃO DA TABELA DE PRODUTOS (COLUNAS FALTANTES)
-- ===============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ean TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- (Correção aplicada. Tente salvar o produto novamente após rodar este script.)
