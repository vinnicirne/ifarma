-- ============================================
-- CATÁLOGO DE PRODUTOS FARMÁCIA (ANVISA - GLOBAL REFERENCE)
-- VERSÃO FINAL LIMPA E CORRIGIDA COM 10.000+ PRODUTOS SIMULADOS
-- ============================================

-- 1. Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- Útil para busca de nomes

-- 2. Tabela principal (Reference Catalog - Read Only for Stores)
CREATE TABLE IF NOT EXISTS public.product_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand TEXT,
    active_ingredient TEXT, -- Princípio Ativo
    category TEXT,
    description TEXT,
    requires_prescription BOOLEAN DEFAULT false,
    ean TEXT UNIQUE, -- Código de Barras Global
    anvisa_registration TEXT, -- Registro MS
    image_url TEXT,
    
    -- Campos extras para enriquecimento (alinhado com v3 schema)
    dosage TEXT,
    quantity_label TEXT,
    manufacturer TEXT,
    tags TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 3. RLS (Segurança)
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler o catálogo (Lojas para importar, Clientes para info)
DROP POLICY IF EXISTS "public_read_catalog" ON public.product_catalog;
CREATE POLICY "public_read_catalog" ON public.product_catalog FOR SELECT USING (true);

-- Política: Apenas Staff/Admin pode modificar o catálogo global
DROP POLICY IF EXISTS "staff_manage_catalog" ON public.product_catalog;
CREATE POLICY "staff_manage_catalog" ON public.product_catalog FOR ALL USING (public.is_staff());

-- 4. Índices de busca (Alta Performance)
CREATE INDEX IF NOT EXISTS idx_product_catalog_name_trgm ON public.product_catalog USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_catalog_brand ON public.product_catalog (brand);
CREATE INDEX IF NOT EXISTS idx_product_catalog_ean ON public.product_catalog (ean);

-- 5. Função Geradora de Dados (Para popular 10.000 itens realistas)
-- Motivo: Inserir 10k linhas hardcoded excederia limites de script.
CREATE OR REPLACE FUNCTION generate_top_products() RETURNS void AS $$
DECLARE
    brands text[] := ARRAY['Medley', 'EMS', 'Neo Química', 'Sanofi', 'Eurofarma', 'Cimed', 'Bayer', 'Aché', 'Teuto', 'Novartis', 'Pfizer', 'GSK', 'Hypera', 'Libbs'];
    categories text[] := ARRAY['Analgésico', 'Anti-inflamatório', 'Antibiótico', 'Anti-hipertensivo', 'Dermocosmético', 'Higiene', 'Infantil', 'Vitamina', 'Gastrointestinal', 'Antigripal'];
    actives text[] := ARRAY['Dipirona', 'Paracetamol', 'Ibuprofeno', 'Amoxicilina', 'Losartana', 'Omeprazol', 'Simeticona', 'Vitamina C', 'Colágeno', 'Nimesulida', 'Pantoprazol', 'Sildenafila', 'Tadalafila'];
    dosages text[] := ARRAY['500mg', '750mg', '1g', '20mg', '50mg', '100mg', 'Spray', 'Xarope 100ml', 'Gotas 20ml', 'Comprimido'];
    
    i integer;
    sel_brand text;
    sel_active text;
    sel_cat text;
    sel_dosage text;
    gen_ean text;
    gen_name text;
    is_controlled boolean;
BEGIN
    -- Loop para gerar 10.000 variações
    FOR i IN 1..10000 LOOP
        sel_brand := brands[1 + floor(random() * array_length(brands, 1))::int];
        sel_active := actives[1 + floor(random() * array_length(actives, 1))::int];
        sel_cat := categories[1 + floor(random() * array_length(categories, 1))::int];
        sel_dosage := dosages[1 + floor(random() * array_length(dosages, 1))::int];
        
        -- Lógica simples de controle
        is_controlled := (sel_cat = 'Antibiótico' OR sel_cat = 'Anti-hipertensivo');
        
        -- Nome formatado exemplo: "Dipirona 500mg - Medley" ou "NomeFantasia"
        gen_name := sel_active || ' ' || sel_dosage || ' - ' || sel_brand;
        
        -- EAN fictício único: 789 + contador formatado
        gen_ean := '789' || lpad(i::text, 10, '0');

        INSERT INTO public.product_catalog (
            name, brand, active_ingredient, category, description, requires_prescription, ean, dosage, quantity_label
        ) VALUES (
            gen_name,
            sel_brand,
            sel_active,
            sel_cat,
            'Medicamento genérico de alta qualidade para tratamento eficaz.',
            is_controlled,
            gen_ean,
            sel_dosage,
            CASE WHEN random() > 0.5 THEN '30 Comprimidos' ELSE '10 Comprimidos' END
        ) ON CONFLICT (ean) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Executar Geração (Popula a base)
SELECT generate_top_products();

-- 7. Inserção dos TOP 20 Produtos Reais (Sobrescreve os gerados se houver conflito, ou adiciona)
INSERT INTO public.product_catalog
(name, brand, active_ingredient, category, description, requires_prescription, ean, image_url)
VALUES
-- ANALGÉSICOS E DOR
('Dorflex 30 comprimidos', 'Sanofi', 'Dipirona + Orfenadrina', 'Relaxante Muscular', 'Analgésico líder no Brasil.', false, '789101100001', 'https://cdn.drogaria.com.br/media/catalog/product/placeholder/default/dorflex_30cp.jpg'),
('Neosaldina 30 drágeas', 'Takeda', 'Dipirona + Isometepteno', 'Analgésico', 'Dor de cabeça e enxaqueca.', false, '789101100002', null),
('Dipirona Monoidratada 1g', 'Medley', 'Dipirona', 'Analgésico', 'Febre e dor intensa.', false, '789101100003', null),
('Tylenol 750mg', 'Johnson & Johnson', 'Paracetamol', 'Analgésico', 'Suave no estômago, forte na dor.', false, '789101100004', null),
('Novalgina 1g', 'Sanofi', 'Dipirona', 'Analgésico', 'Tradição contra febre.', false, '789101100005', null),

-- ANTI-INFLAMATÓRIOS
('Ibuprofeno 600mg', 'Eurofarma', 'Ibuprofeno', 'Anti-inflamatório', 'Alívio da dor e inflamação.', false, '789101100014', null),
('Nimesulida 100mg', 'Cimed', 'Nimesulida', 'Anti-inflamatório', 'Indicado para dor de garganta.', true, '789101100011', null),
('Toragesic 10mg', 'EMS', 'Cetoprofeno', 'Anti-inflamatório', 'Dor aguda sublual.', true, '789101100012', null),

-- GASTRO E DIGESTÃO
('Omeprazol 20mg', 'Medley', 'Omeprazol', 'Gastrointestinal', 'Proteção gástrica contra gastrite.', false, '789101100016', null),
('Luftal Gotas', 'Reckitt', 'Simeticona', 'Antigases', 'Alívio do estufamento abdominal.', false, '789101100019', null),
('Eno Sal de Fruta', 'GSK', 'Bicarbonato', 'Antiácido', 'Azia e má digestão.', false, '789101100020', null),
('Xantinon', 'Takeda', 'Metionina', 'Hepatoprotetor', 'Ajuda na digestão de gorduras.', false, '789101100021', null),

-- USO CONTÍNUO
('Losartana Potássica 50mg', 'Neo Química', 'Losartana', 'Anti-hipertensivo', 'Controle da pressão arterial.', true, '789101100024', null),
('AAS Infantil 100mg', 'Sanofi', 'Ácido Acetilsalicílico', 'Antiagregante', 'Prevenção de infartos.', false, '789101100030', null),
('Glifage XR 500mg', 'Merck', 'Metformina', 'Antidiabético', 'Controle de glicemia.', true, '789101100031', null),
('Puran T4 100mcg', 'Sanofi', 'Levotiroxina', 'Hormônio', 'Reposição tireoidiana.', true, '789101100032', null),

-- ANTIBIÓTICOS (Controlados)
('Amoxicilina 500mg', 'EMS', 'Amoxicilina', 'Antibiótico', 'Infecções bacterianas gerais.', true, '789101100043', null),
('Azitromicina 500mg', 'Medley', 'Azitromicina', 'Antibiótico', 'Tratamento curto de 3 a 5 dias.', true, '789101100044', null),

-- RESPIRATÓRIO E GRIPE
('Neosoro Solução', 'Neo Química', 'Nafazolina', 'Descongestionante', 'Alívio rápido da congestão nasal.', false, '789101100047', null),
('Aerolin Spray', 'GSK', 'Salbutamol', 'Broncodilatador', 'Alívio das crises de asma.', true, '789101100053', null),
('Cimegripe', 'Cimed', 'Paracetamol + Clorfeniramina', 'Antigripal', 'Combate os sintomas da gripe.', false, '789101100054', null),

-- DERMATOLÓGICOS E HIGIENE
('Bepantol Derma Creme', 'Bayer', 'Dexpantenol', 'Hidratante', 'Pele seca e tatuagens.', false, '789101100071', null),
('Nebacetin Pomada', 'Takeda', 'Neomicina + Bacitracina', 'Antibiótico Tópico', 'Para ferimentos e cortes.', false, '789101100073', null),
('Hipoglós Amêndoas', 'P&G', 'Óxido de Zinco', 'Assaduras', 'Proteção para o bebê.', false, '789101100074', null),

-- OUTROS
('Preservativo Jontex Lubrificado', 'Reckitt', 'Preservativo', 'Sexualidade', 'Segurança e conforto.', false, '789101100091', null),
('Teste Gravidez Clearblue', 'Clearblue', 'Teste Rápido', 'Diagnóstico', 'Resultado em 1 minuto.', false, '789101100093', null),
('Albendazol 400mg', 'Prati', 'Albendazol', 'Antiparasitário', 'Tratamento de vermes.', true, '789101100097', null)

ON CONFLICT (ean) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    active_ingredient = EXCLUDED.active_ingredient,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    requires_prescription = EXCLUDED.requires_prescription,
    dosage = EXCLUDED.dosage;

-- 8. Limpeza (Opcional: remove a função após uso)
DROP FUNCTION IF EXISTS generate_top_products();

-- 9. Notificar sucesso
DO $$
BEGIN
    RAISE NOTICE 'Catálogo ANVISA atualizado com sucesso. 27 produtos reais + 10.000 simulados.';
END $$;
