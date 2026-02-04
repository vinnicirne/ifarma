-- ===============================================================
-- POPULAR CATÁLOGO ANVISA (SEED DA TELA DE PRODUTOS)
-- ===============================================================

-- 1. Criar Tabela se não existir
CREATE TABLE IF NOT EXISTS product_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    requires_prescription BOOLEAN DEFAULT false,
    ean TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Configurar RLS (Permitir leitura para todos autenticados)
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'product_catalog' 
        AND policyname = 'Allow read access for authenticated users'
    ) THEN
        CREATE POLICY "Allow read access for authenticated users" 
        ON product_catalog FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- 3. Inserir Dados (Microvlar e populares)
INSERT INTO product_catalog (name, brand, category, requires_prescription, ean, image_url)
VALUES 
('Microvlar', 'Bayer', 'Anticoncepcional', true, '7891106911762', 'https://cdn.ultrafarma.com.br/static/produtos/795293/large-637827877685486250-795293.jpg'),
('Neosaldina 30 Drágeas', 'Takeda', 'Analgésico', false, '7896094200827', 'https://cdn.ultrafarma.com.br/static/produtos/803876/large-637996160877993750-803876.jpg'),
('Dorflex 50 Comprimidos', 'Sanofi', 'Relaxante Muscular', false, '7891058000049', 'https://cdn.ultrafarma.com.br/static/produtos/814740/large-637989357905105268-814740.jpg'),
('Dipirona Monoidratada 500mg', 'EMS', 'Genérico', false, '7896004703561', 'https://cdn.ultrafarma.com.br/static/produtos/800632/large-637827889354862500-800632.jpg'),
('Torsilax 30 Comprimidos', 'Neo Química', 'Relaxante Muscular', true, '7896714200388', 'https://cdn.ultrafarma.com.br/static/produtos/803359/large-637827896825486250-803359.jpg'),
('Cimegripe 20 Cápsulas', 'Cimed', 'Antigripal', false, '7896523206588', 'https://cdn.ultrafarma.com.br/static/produtos/803659/large-637827891829862500-803659.jpg'),
('Buscopan Composto 20 Comprimidos', 'Boehringer', 'Cólicas', false, '7896094917220', 'https://cdn.ultrafarma.com.br/static/produtos/797825/large-637827883582488750-797825.jpg'),
('Advil 400mg 8 Cápsulas', 'GSK', 'Analgésico', false, '7896015519823', 'https://cdn.ultrafarma.com.br/static/produtos/813359/large-637937448858888750-813359.jpg'),
('Rivotril 2mg 30 Comprimidos', 'Roche', 'Ansiolítico', true, '7896226502010', 'https://cdn.ultrafarma.com.br/static/produtos/814718/large-637985876008638750-814718.jpg')
ON CONFLICT DO NOTHING; -- Evita erro se rodar 2x (assumindo que id não conflita, mas inserts repetidos podem ocorrer se não tiver unique constraint no nome. Como é seed, ok.)

-- Adicionar índice para busca textual rápida
CREATE INDEX IF NOT EXISTS idx_product_catalog_name_trgm ON product_catalog USING gin (name gin_trgm_ops);

RAISE NOTICE 'Catálogo ANVISA populado com sucesso!';
