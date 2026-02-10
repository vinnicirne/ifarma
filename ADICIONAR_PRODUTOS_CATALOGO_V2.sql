-- ============================================
-- ADICIONAR PRODUTOS SOLICITADOS AO CATÁLOGO ANVISA
-- ============================================

INSERT INTO public.product_catalog 
(name, brand, active_ingredient, category, description, requires_prescription, ean, tags, keywords, product_type)
VALUES
-- ANALGÉSICOS
('Dorflex 30 comprimidos', 'Sanofi', ARRAY['Dipirona', 'Orfenadrina'], 'Analgésico', 'Analgésico líder no Brasil.', false, '789101100001', ARRAY['dor', 'muscular', 'relaxante'], ARRAY['dorflex', 'dor nas costas'], 'reference'),
('Neosaldina 30 drágeas', 'Takeda', ARRAY['Dipirona', 'Isometepteno'], 'Analgésico', 'Dor de cabeça.', false, '789101100002', ARRAY['dor', 'cabeça', 'enxaqueca'], ARRAY['neosaldina', 'neosa'], 'reference'),
('Dipirona Monoidratada 1g', 'Medley', ARRAY['Dipirona'], 'Analgésico', 'Febre e dor.', false, '789101100003', ARRAY['dor', 'febre'], ARRAY['dipirona', 'genérico'], 'generic'),
('Tylenol 750mg', 'Johnson & Johnson', ARRAY['Paracetamol'], 'Analgésico', 'Suave no estômago.', false, '789101100004', ARRAY['dor', 'febre', 'estômago'], ARRAY['tylenol', 'paracetamol'], 'reference'),
('Novalgina 1g', 'Sanofi', ARRAY['Dipirona'], 'Analgésico', 'Contra febre.', false, '789101100005', ARRAY['dor', 'febre'], ARRAY['novalgina', 'dipirona'], 'reference'),

-- ANTI-INFLAMATÓRIOS
('Ibuprofeno 600mg', 'Eurofarma', ARRAY['Ibuprofeno'], 'Anti-inflamatório', 'Dor e inflamação.', false, '789101100014', ARRAY['dor', 'inflamação'], ARRAY['ibuprofeno', 'genérico'], 'generic'),
('Nimesulida 100mg', 'Cimed', ARRAY['Nimesulida'], 'Anti-inflamatório', 'Uso comum em garganta.', true, '789101100011', ARRAY['dor', 'garganta', 'inflamação'], ARRAY['nimesulida', 'genérico'], 'generic'),

-- GASTRO
('Omeprazol 20mg', 'Medley', ARRAY['Omeprazol'], 'Gastrointestinal', 'Proteção gástrica.', false, '789101100016', ARRAY['estômago', 'gastrite', 'azia'], ARRAY['omeprazol', 'protetor'], 'generic'),
('Luftal Gotas', 'Reckitt', ARRAY['Simeticona'], 'Gastrointestinal', 'Alívio abdominal.', false, '789101100019', ARRAY['gases', 'abdominal', 'colica'], ARRAY['luftal', 'simeticona'], 'reference'),

-- HIPERTENSÃO
('Losartana 50mg', 'Neo Química', ARRAY['Losartana'], 'Anti-hipertensivo', 'Controle da pressão.', true, '789101100024', ARRAY['pressão', 'hipertensão', 'coração'], ARRAY['losartana', 'genérico'], 'generic'),
('AAS Infantil 100mg', 'Sanofi', ARRAY['Ácido Acetilsalicílico'], 'Cardiovascular', 'Prevenção cardiovascular.', false, '789101100030', ARRAY['coração', 'prevenção'], ARRAY['aas', 'aspirina'], 'reference'),

-- ANTIBIÓTICOS
('Amoxicilina 500mg', 'EMS', ARRAY['Amoxicilina'], 'Antibiótico', 'Infecções bacterianas.', true, '789101100043', ARRAY['infecção', 'antibiótico'], ARRAY['amoxicilina', 'genérico'], 'generic'),
('Azitromicina 500mg', 'Medley', ARRAY['Azitromicina'], 'Antibiótico', 'Tratamento curto.', true, '789101100044', ARRAY['infecção', 'garganta', 'antibiótico'], ARRAY['azitromicina', 'genérico'], 'generic'),

-- RESPIRATÓRIO
('Neosoro', 'Neo Química', ARRAY['Nafazolina'], 'Respiratório', 'Alívio nasal.', false, '789101100047', ARRAY['nariz', 'entupido', 'gripe'], ARRAY['neosoro', 'nariz'], 'reference'),
('Aerolin Spray', 'GSK', ARRAY['Salbutamol'], 'Respiratório', 'Asma.', true, '789101100053', ARRAY['asma', 'bronquite', 'ar'], ARRAY['aerolin', 'bombinha'], 'reference'),

-- GINECOLÓGICO
('Gino Canesten', 'Bayer', ARRAY['Clotrimazol'], 'Ginecológico', 'Tratamento de candidíase.', true, '789101100095', ARRAY['intimo', 'mulher', 'fungo'], ARRAY['gino', 'canesten'], 'reference'),

-- DERMATO
('Bepantol Derma', 'Bayer', ARRAY['Dexpantenol'], 'Dermocosmético', 'Hidratação profunda.', false, '789101100071', ARRAY['pele', 'hidratação', 'seca'], ARRAY['bepantol', 'creme'], 'reference'),
('Nebacetin Pomada', 'Takeda', ARRAY['Neomicina', 'Bacitracina'], 'Antibiótico Tópico', 'Ferimentos.', false, '789101100073', ARRAY['ferida', 'corte', 'pele'], ARRAY['nebacetin', 'pomada'], 'reference'),

-- OUTROS
('Preservativo Jontex', 'Reckitt', ARRAY['Látex'], 'Outros', 'Lubrificado.', false, '789101100091', ARRAY['camisinha', 'sexo'], ARRAY['jontex', 'lubrificado'], 'reference'),
('Teste Gravidez Clearblue', 'Clearblue', ARRAY['Teste'], 'Diagnóstico', 'Resultado rápido.', false, '789101100093', ARRAY['gravidez', 'teste'], ARRAY['clearblue', 'confira'], 'reference'),
('Albendazol 400mg', 'Prati', ARRAY['Albendazol'], 'Antiparasitário', 'Verminoses.', true, '789101100097', ARRAY['verme', 'parasita'], ARRAY['albendazol', 'verminose'], 'generic')

ON CONFLICT (ean) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    description = EXCLUDED.description,
    active_ingredient = EXCLUDED.active_ingredient,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    keywords = EXCLUDED.keywords,
    requires_prescription = EXCLUDED.requires_prescription
;
