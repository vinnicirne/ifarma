-- ============================================
-- ATUALIZAÇÃO DA TABELA PRODUCTS (INVENTÁRIO)
-- Adiciona TODOS os campos do catálogo único
-- ============================================

-- 1. Adicionar novos campos à tabela products
ALTER TABLE public.products
-- FARMACÊUTICO
ADD COLUMN IF NOT EXISTS pharmaceutical_form TEXT DEFAULT 'Comprimido', -- Comprimido, Xarope, Cápsula, Pomada
ADD COLUMN IF NOT EXISTS product_type TEXT CHECK (product_type IN ('reference', 'generic', 'similar')) DEFAULT 'generic',
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,

-- REGULATÓRIO
ADD COLUMN IF NOT EXISTS prescription_type TEXT CHECK (prescription_type IN ('white', 'yellow_a', 'blue_b', 'special_c', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS controlled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS age_restriction TEXT,

-- CONTEÚDO
ADD COLUMN IF NOT EXISTS indication TEXT, -- Para que serve
ADD COLUMN IF NOT EXISTS warnings TEXT, -- Advertências

-- BUSCA
ADD COLUMN IF NOT EXISTS keywords TEXT[]; -- Palavras-chave adicionais

-- 2. Atualizar prescription_type baseado em requires_prescription existente
UPDATE public.products 
SET prescription_type = CASE 
    WHEN requires_prescription = true THEN 'white'
    ELSE 'none'
END
WHERE prescription_type = 'none';

-- 3. Criar índices para novos campos de busca
CREATE INDEX IF NOT EXISTS idx_products_keywords ON public.products USING gin (keywords);
CREATE INDEX IF NOT EXISTS idx_products_pharmaceutical_form ON public.products (pharmaceutical_form);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products (product_type);

-- 4. Notificação
DO $$
BEGIN
    RAISE NOTICE '✅ Tabela PRODUCTS atualizada com todos os campos do catálogo único!';
END $$;

-- ============================================
-- EXEMPLO DE COMO OS DADOS FICAM:
-- ============================================
-- {
--   "produto": {
--     "id": "uuid",
--     "pharmacy_id": "uuid",
--     "nome": "Dipirona 500mg",
--     "marca": "Medley",
--     "manufacturer": "Sanofi Medley",
--     "ean": "7891234567890",
--     "category": "Analgésico",
--     "subcategory": "Dor e Febre",
--     "principle_active": ["Dipirona Sódica"],
--     "pharmaceutical_form": "Comprimido",
--     "dosage": "500mg",
--     "quantity_label": "20 comprimidos",
--     "product_type": "generic",
--     "requires_prescription": false,
--     "prescription_type": "none",
--     "controlled": false,
--     "age_restriction": "Uso adulto e pediátrico",
--     "indication": "Tratamento de dores leves a moderadas e febre",
--     "usage_instructions": "Tomar 1 a 2 comprimidos até 4x ao dia",
--     "warnings": "Pode causar reações alérgicas",
--     "tags": ["dor", "febre"],
--     "synonyms": ["remédio pra dor", "dor de cabeça"],
--     "keywords": ["dipirona", "analgésico"],
--     "price": 12.90,
--     "stock": 50
--   }
-- }
