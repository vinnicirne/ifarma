-- ============================================
-- ADICIONAR PRODUTOS SOLICITADOS AO CATÁLOGO ANVISA
-- ============================================

INSERT INTO public.product_catalog 
(name, brand, active_ingredient, category, description, requires_prescription, ean, tags, keywords)
VALUES
-- ANALGÉSICOS
('Dorflex 30 comprimidos', 'Sanofi', ARRAY['Dipirona', 'Orfenadrina'], 'Relaxante Muscular', 'Analgésico líder no Brasil.', false, '789101100001', ARRAY['dor', 'muscular', 'relaxante'], ARRAY['dorflex', 'dor nas costas']),
('Neosaldina 30 drágeas', 'Takeda', ARRAY['Dipirona', 'Isometepteno'], 'Analgésico', 'Dor de cabeça.', false, '789101100002', ARRAY['dor', 'cabeça', 'enxaqueca'], ARRAY['neosaldina', 'neosa']),
('Dipirona Monoidratada 1g', 'Medley', ARRAY['Dipirona'], 'Analgésico', 'Febre e dor.', false, '789101100003', ARRAY['dor', 'febre'], ARRAY['dipirona', 'genérico']),
('Tylenol 750mg', 'Johnson & Johnson', ARRAY['Paracetamol'], 'Analgésico', 'Suave no estômago.', false, '789101100004', ARRAY['dor', 'febre', 'estômago'], ARRAY['tylenol', 'paracetamol']),
('Novalgina 1g', 'Sanofi', ARRAY['Dipirona'], 'Analgésico', 'Contra febre.', false, '789101100005', ARRAY['dor', 'febre'], ARRAY['novalgina', 'dipirona']),

-- ANTI-INFLAMATÓRIOS
('Ibuprofeno 600mg', 'Eurofarma', ARRAY['Ibuprofeno'], 'Anti-inflamatório', 'Dor e inflamação.', false, '789101100014', ARRAY['dor', 'inflamação'], ARRAY['ibuprofeno', 'genérico']),
('Nimesulida 100mg', 'Cimed', ARRAY['Nimesulida'], 'Anti-inflamatório', 'Uso comum em garganta.', true, '789101100011', ARRAY['dor', 'garganta', 'inflamação'], ARRAY['nimesulida', 'genérico']),

-- GASTRO
('Omeprazol 20mg', 'Medley', ARRAY['Omeprazol'], 'Gastrointestinal', 'Proteção gástrica.', false, '789101100016', ARRAY['estômago', 'gastrite', 'azia'], ARRAY['omeprazol', 'protetor']),
('Luftal Gotas', 'Reckitt', ARRAY['Simeticona'], 'Antigases', 'Alívio abdominal.', false, '789101100019', ARRAY['gases', 'abdominal', 'colica'], ARRAY['luftal', 'simeticona']),

-- HIPERTENSÃO
('Losartana 50mg', 'Neo Química', ARRAY['Losartana'], 'Anti-hipertensivo', 'Controle da pressão.', true, '789101100024', ARRAY['pressão', 'hipertensão', 'coração'], ARRAY['losartana', 'genérico']),
('AAS Infantil 100mg', 'Sanofi', ARRAY['Ácido Acetilsalicílico'], 'Antiagregante', 'Prevenção cardiovascular.', false, '789101100030', ARRAY['coração', 'prevenção'], ARRAY['aas', 'aspirina']),

-- ANTIBIÓTICOS
('Amoxicilina 500mg', 'EMS', ARRAY['Amoxicilina'], 'Antibiótico', 'Infecções bacterianas.', true, '789101100043', ARRAY['infecção', 'antibiótico'], ARRAY['amoxicilina', 'genérico']),
('Azitromicina 500mg', 'Medley', ARRAY['Azitromicina'], 'Antibiótico', 'Tratamento curto.', true, '789101100044', ARRAY['infecção', 'garganta', 'antibiótico'], ARRAY['azitromicina', 'genérico']),

-- RESPIRATÓRIO
('Neosoro', 'Neo Química', ARRAY['Nafazolina'], 'Descongestionante', 'Alívio nasal.', false, '789101100047', ARRAY['nariz', 'entupido', 'gripe'], ARRAY['neosoro', 'nariz']),
('Aerolin Spray', 'GSK', ARRAY['Salbutamol'], 'Broncodilatador', 'Asma.', true, '789101100053', ARRAY['asma', 'bronquite', 'ar'], ARRAY['aerolin', 'bombinha']),

-- GINECOLÓGICO
('Gino Canesten', 'Bayer', ARRAY['Clotrimazol'], 'Ginecológico', 'Tratamento de candidíase.', true, '789101100095', ARRAY['intimo', 'mulher', 'fungo'], ARRAY['gino', 'canesten']),

-- DERMATO
('Bepantol Derma', 'Bayer', ARRAY['Dexpantenol'], 'Hidratante', 'Hidratação profunda.', false, '789101100071', ARRAY['pele', 'hidratação', 'seca'], ARRAY['bepantol', 'creme']),
('Nebacetin Pomada', 'Takeda', ARRAY['Neomicina', 'Bacitracina'], 'Antibiótico Tópico', 'Ferimentos.', false, '789101100073', ARRAY['ferida', 'corte', 'pele'], ARRAY['nebacetin', 'pomada']),

-- OUTROS
('Preservativo Jontex', 'Reckitt', ARRAY['Látex'], 'Sexualidade', 'Lubrificado.', false, '789101100091', ARRAY['camisinha', 'sexo'], ARRAY['jontex', 'lubrificado']),
('Teste Gravidez Clearblue', 'Clearblue', ARRAY['Teste'], 'Diagnóstico', 'Resultado rápido.', false, '789101100093', ARRAY['gravidez', 'teste'], ARRAY['clearblue', 'confira']),
('Albendazol 400mg', 'Prati', ARRAY['Albendazol'], 'Antiparasitário', 'Verminoses.', true, '789101100097', ARRAY['verme', 'parasita'], ARRAY['albendazol', 'verminose'])

ON CONFLICT (ean) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    description = EXCLUDED.description,
    active_ingredient = EXCLUDED.active_ingredient,
    classification = EXCLUDED.category -- Ajuste conforme o nome correto da coluna
;
