-- Criar tabela de catálogo de produtos (Portfólio ANVISA)
CREATE TABLE product_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand TEXT,
    active_ingredient TEXT, -- Substância ativa
    category TEXT,
    description TEXT,
    requires_prescription BOOLEAN DEFAULT false,
    ean TEXT UNIQUE, -- Código de barras
    anvisa_registration TEXT, -- Registro ANVISA
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS no catálogo
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler o catálogo
CREATE POLICY "Todos podem ver o catálogo de produtos" ON product_catalog
    FOR SELECT USING (true);

-- Inserir alguns produtos de exemplo (Simulando dados da ANVISA)
INSERT INTO product_catalog (name, brand, active_ingredient, category, description, requires_prescription, ean) VALUES
('Dipirona Sódica 500mg', 'Medley', 'Dipirona Sódica', 'Analgésico', 'Indicado para dor e febre.', false, '7891011121314'),
('Amoxicilina 500mg', 'EMS', 'Amoxicilina', 'Antibiótico', 'Tratamento de infecções bacterianas.', true, '7891011121315'),
('Dorflex 10 comprimidos', 'Sanofi', 'Dipirona + Citrato de Orfenadrina + Cafeína Anidra', 'Relaxante Muscular', 'Indicado para alívio de dores associadas a contraturas musculares.', false, '7891011121316'),
('Ibuprofeno 600mg', 'Eurofarma', 'Ibuprofeno', 'Anti-inflamatório', 'Alívio da dor e redução da inflamação.', false, '7891011121317'),
('Losartana Potássica 50mg', 'Neo Química', 'Losartana Potássica', 'Anti-hipertensivo', 'Tratamento da hipertensão arterial.', true, '7891011121318'),
('Paracetamol 750mg', 'Tylenol', 'Paracetamol', 'Analgésico', 'Alívio temporário de dores leves a moderadas.', false, '7891011121319');

-- Adicionar índice para busca por nome
CREATE INDEX idx_catalog_name ON product_catalog USING gin (name gin_trgm_ops); -- Requer pg_trgm
-- Caso pg_trgm não esteja disponível, use um índice normal ou btree
-- CREATE INDEX idx_catalog_name_prefix ON product_catalog (name text_pattern_ops);
