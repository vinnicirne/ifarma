-- ATUALIZAÇÃO CATÁLOGO ANVISA - VERSÃO CORRIGIDA
-- Copie e cole no SQL Editor do Supabase

-- 1. Habilitar extensão necessária para o índice (CORREÇÃO DO ERRO 42704)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Criar tabela se não existir
CREATE TABLE IF NOT EXISTS product_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand TEXT,
    active_ingredient TEXT,
    category TEXT,
    description TEXT,
    requires_prescription BOOLEAN DEFAULT false,
    ean TEXT UNIQUE,
    anvisa_registration TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Habilitar RLS e Índices
DO $$ 
BEGIN 
    ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY; 
    CREATE POLICY "Todos podem ver o catálogo de produtos" ON product_catalog FOR SELECT USING (true);
EXCEPTION 
    WHEN OTHERS THEN NULL; 
END $$;

-- Índice para busca rápida (Funciona com pg_trgm habilitado no passo 1)
CREATE INDEX IF NOT EXISTS idx_catalog_name_trgm ON product_catalog USING gin (name gin_trgm_ops);

-- 4. Inserir Top 100 Produtos
INSERT INTO product_catalog (name, brand, active_ingredient, category, description, requires_prescription, ean) VALUES

-- ANALGÉSICOS E ANTITÉRMICOS (Top Sellers)
('Dorflex 30 comprimidos', 'Sanofi', 'Dipirona + Orfenadrina', 'Relaxante Muscular', 'O analgésico número 1 do Brasil. Relaxa a tensão muscular.', false, '789101100001'),
('Neosaldina 30 drágeas', 'Takeda', 'Dipirona + Isometepteno', 'Analgésico', 'Especialista em todo tipo de dor de cabeça.', false, '789101100002'),
('Dipirona Monohidratada 1g', 'Medley', 'Dipirona', 'Analgésico', 'Genérico de confiança para febre e dor.', false, '789101100003'),
('Tylenol 750mg 20cp', 'Johnson & Johnson', 'Paracetamol', 'Analgésico', 'Suave no estômago, forte contra a dor.', false, '789101100004'),
('Novalgina 1g 10cp', 'Sanofi', 'Dipirona', 'Analgésico', 'Tradição e eficácia contra febre.', false, '789101100005'),
('Advil 400mg 8 caps', 'GSK', 'Ibuprofeno', 'Analgésico', 'Capsulas líquidas de rápida ação.', false, '789101100006'),
('Buscopan Composto', 'Boehringer', 'Escopolamina + Dipirona', 'Antiespasmódico', 'Para cólicas e dores abdominais.', false, '789101100007'),
('Toragesic 10mg', 'EMS', 'Cetarolaco', 'Anti-inflamatório', 'Potente para dores agudas.', true, '789101100008'),
('Tramal 50mg', 'Grünenthal', 'Tramadol', 'Opioide', 'Para dores moderadas a severas.', true, '789101100009'),
('Paracetamol Bebê', 'Medley', 'Paracetamol', 'Analgésico', 'Gotas para uso pediátrico.', false, '789101100010'),

-- ANTI-INFLAMATÓRIOS
('Nimesulida 100mg', 'Cimed', 'Nimesulida', 'Anti-inflamatório', 'Líder em prescrições para garganta e dente.', true, '789101100011'),
('CataflamPro Emulgel', 'GSK', 'Diclofenaco', 'Tópico', 'Alívio direto na dor muscular.', false, '789101100012'),
('Diclofenaco Potássico 50mg', 'Neo Química', 'Diclofenaco', 'Anti-inflamatório', 'Trata inflamações reumáticas.', false, '789101100013'),
('Ibuprofeno 600mg', 'Eurofarma', 'Ibuprofeno', 'Anti-inflamatório', 'Ação prolongada contra inflamação.', false, '789101100014'),
('Spidufen 600mg', 'Zambon', 'Ibuprofeno', 'Analgésico', 'Alívio rápido com sabor menta.', false, '789101100015'),

-- GASTROINTESTINAL
('Omeprazol 20mg', 'Medley', 'Omeprazol', 'Gastrointestinal', 'Proteção gástrica diária.', false, '789101100016'),
('Pantoprazol 40mg', 'EMS', 'Pantoprazol', 'Gastrointestinal', 'Tratamento de refluxo e gastrite.', false, '789101100017'),
('Eno Sal de Fruta', 'GSK', 'Bicarbonato de Sódio', 'Antiácido', 'Dois tempos para azia.', false, '789101100018'),
('Luftal Gotas', 'Reckitt', 'Simeticona', 'Antigases', 'Alívio do desconforto abdominal.', false, '789101100019'),
('Estomazil Pó', 'Cimed', 'Antiácido', 'Gastrointestinal', 'Alívio da má digestão.', false, '789101100020'),
('Simeticona 125mg', 'Teuto', 'Simeticona', 'Antigases', 'Cápsulas gelatinosas.', false, '789101100021'),
('Vonau Flash 4mg', 'Biolab', 'Ondansetrona', 'Antiemético', 'Dissolve na boca, para náuseas.', true, '789101100022'),
('Dramin B6', 'Takeda', 'Dimenidrinato', 'Antiemético', 'Para enjoos de viagem.', false, '789101100023'),

-- HIPERTENSÃO E CORAÇÃO
('Losartana Potássica 50mg', 'Neo Química', 'Losartana', 'Anti-hipertensivo', 'Controle da pressão alta.', true, '789101100024'),
('Enalapril 10mg', 'Medley', 'Enalapril', 'Anti-hipertensivo', 'Vasodilatador potente.', true, '789101100025'),
('Atenolol 25mg', 'Biolab', 'Atenolol', 'Betabloqueador', 'Controle de arritmias.', true, '789101100026'),
('Hidroclorotiazida 25mg', 'EMS', 'Hidroclorotiazida', 'Diurético', 'Auxiliar no controle da pressão.', true, '789101100027'),
('Captopril 25mg', 'Teuto', 'Captopril', 'Anti-hipertensivo', 'Uso sublingual em emergências.', true, '789101100028'),
('Xarelto 20mg', 'Bayer', 'Rivaroxabana', 'Anticoagulante', 'Prevenção de AVC e trombose.', true, '789101100029'),
('Aas Infantil 100mg', 'Sanofi', 'Ácido Acetilsalicílico', 'Antiagregante', 'Prevenção de infartos.', false, '789101100030'),
('Aradois 50mg', 'Biolab', 'Losartana', 'Anti-hipertensivo', 'Marca de referência.', true, '789101100031'),

-- DIABETES
('Glifage XR 500mg', 'Merck', 'Metformina', 'Antidiabético', 'Liberação prolongada para diabetes tipo 2.', true, '789101100032'),
('Metformina 850mg', 'Prati', 'Metformina', 'Antidiabético', 'Controle glicêmico.', true, '789101100033'),
('Gliclazida 30mg', 'Servier', 'Gliclazida', 'Antidiabético', 'Estimula produção de insulina.', true, '789101100034'),
('Accu-Chek Active 50 tiras', 'Roche', 'Tiras Reagentes', 'Monitoramento', 'Tiras para glicosímetro.', false, '789101100035'),

-- SAÚDE MENTAL E SONO (Controlados)
('Rivotril 2mg', 'Roche', 'Clonazepam', 'Ansiolítico', 'Controle de ansiedade e pânico.', true, '789101100036'),
('Clonazepam 2.5mg ml', 'Medley', 'Clonazepam', 'Ansiolítico', 'Gotas para ansiedade.', true, '789101100037'),
('Sertralina 50mg', 'Eurofarma', 'Sertralina', 'Antidepressivo', 'Tratamento de depressão e ansiedade.', true, '789101100038'),
('Escitalopram 10mg', 'EMS', 'Escitalopram', 'Antidepressivo', 'Moderno e com menos efeitos colaterais.', true, '789101100039'),
('Zolpidem 10mg', 'Medley', 'Zolpidem', 'Hipnótico', 'Indutor do sono rápido.', true, '789101100040'),
('Alprazolam 0.5mg', 'Nova Química', 'Alprazolam', 'Ansiolítico', 'Calmante de ação curta.', true, '789101100041'),
('Fluoxetina 20mg', 'Teuto', 'Fluoxetina', 'Antidepressivo', 'Clássico antidepressivo.', true, '789101100042'),

-- ANTIBIÓTICOS (Receita Retida)
('Amoxicilina + Clavulanato 875mg', 'EMS', 'Amoxicilina', 'Antibiótico', 'Espectro estendido.', true, '789101100043'),
('Azitromicina 500mg 3cp', 'Medley', 'Azitromicina', 'Antibiótico', 'Dose única diária.', true, '789101100044'),
('Cefalexina 500mg', 'Eurofarma', 'Cefalexina', 'Antibiótico', 'Infecções de pele e tecidos.', true, '789101100045'),
('Ciprofloxacino 500mg', 'Neo Química', 'Ciprofloxacino', 'Antibiótico', 'Infecções urinárias complicadas.', true, '789101100046'),

-- RESPIRATÓRIO E ALEGIA
('Neosoro', 'Neo Química', 'Nafazolina', 'Descongestionante', 'Alívio nasal rápido.', false, '789101100047'),
('Allegra 120mg', 'Sanofi', 'Fexofenadina', 'Antialérgico', 'Não dá sono.', false, '789101100048'),
('Loratadina 10mg', 'Cimed', 'Loratadina', 'Antialérgico', 'Custo benefício em alergias.', false, '789101100049'),
('Polaramine', 'Mantecorp', 'Dexclorfeniramina', 'Antialérgico', 'Clássico para coceiras.', false, '789101100050'),
('Alegra Pediátrico', 'Sanofi', 'Fexofenadina', 'Antialérgico', 'Suspensão oral.', false, '789101100051'),
('Sorine Infantil', 'Aché', 'Cloreto de Sódio', 'Descongestionante', 'Hidratação nasal suave.', false, '789101100052'),
('Aerolin Spray', 'GSK', 'Salbutamol', 'Broncodilatador', 'A bombinha da asma.', true, '789101100053'),
('Prednisolona 20mg', 'EMS', 'Prednisolona', 'Corticuoide', 'Anti-inflamatório esteroide.', true, '789101100054'),
('Vick Vaporub 12g', 'P&G', 'Mentol', 'Descongestionante', 'Pomada para alívio da tosse.', false, '789101100055'),

-- ANTICONCEPCIONAIS
('Ciclo 21', 'União Química', 'Levonorgestrel + Etinilestradiol', 'Anticoncepcional', 'O mais popular do Brasil.', true, '789101100056'),
('Microvlar', 'Bayer', 'Levonorgestrel + Etinilestradiol', 'Anticoncepcional', 'Baixa dosagem.', true, '789101100057'),
('Selene', 'Eurofarma', 'Etinilestradiol + Ciproterona', 'Anticoncepcional', 'Trata acne e SOP.', true, '789101100058'),
('Diane 35', 'Bayer', 'Etinilestradiol + Ciproterona', 'Anticoncepcional', 'Referência para pele.', true, '789101100059'),
('Yasmin', 'Bayer', 'Drospirenona + Etinilestradiol', 'Anticoncepcional', 'Menor retenção de líquido.', true, '789101100060'),
('Cerazette', 'Organon', 'Desogestrel', 'Anticoncepcional', 'Uso contínuo.', true, '789101100061'),

-- VITAMINAS E SUPLEMENTOS
('Vitamina C 1g', 'Cimegripe', 'Ácido Ascórbico', 'Vitamina', 'Imunidade e energia.', false, '789101100062'),
('Lavitan A-Z', 'Cimed', 'Polivitamínico', 'Suplemento', 'Energia para o dia a dia.', false, '789101100063'),
('Centrum', 'Haleon', 'Polivitamínico', 'Suplemento', 'Completo de A a Zinco.', false, '789101100064'),
('Adquira D 50.000ui', 'Mantecorp', 'Colecalciferol', 'Vitamina', 'Reposição de Vitamina D.', false, '789101100065'),
('Citoneurin 5000', 'P&G', 'Complexo B', 'Vitamina', 'Para dores neurais.', false, '789101100066'),
('Pharmaton Complex', 'Sanofi', 'Ginseng', 'Suplemento', 'Foco e energia física.', false, '789101100067'),

-- DISFUNÇÃO ERÉTIL
('Viagra 50mg', 'Viatris', 'Sildenafila', 'Vasodilatador', 'O azulzinho original.', true, '789101100068'),
('Tadalafila 20mg', 'Eurofarma', 'Tadalafila', 'Vasodilatador', 'Efeito prolongado de 36h.', true, '789101100069'),
('Cialis 20mg', 'Lilly', 'Tadalafila', 'Vasodilatador', 'Referência em duração.', true, '789101100070'),

-- DERMOCOSMÉTICOS E PELE
('Bepantol Derma', 'Bayer', 'Dexpantenol', 'Hidratante', 'Poderosa hidratação labial e pele.', false, '789101100071'),
('Hipoglós 40g', 'Johnson', 'Óxido de Zinco', 'Pomada', 'Contra assaduras.', false, '789101100072'),
('Nebacetin 15g', 'Takeda', 'Neomicina', 'Antibiótico Tópico', 'Para cortes e ferimentos.', false, '789101100073'),
('Minoxidil 5%', 'Pant', 'Minoxidil', 'Capilar', 'Tratamento de queda de cabelo.', false, '789101100074'),
('La Roche-Posay Anthelios 60', 'Loreal', 'Protetor Solar', 'Dermo', 'Proteção solar toque seco.', false, '789101100075'),

-- INFANTIL E HIGIENE
('Pampers Confort Sec M', 'P&G', 'Fralda', 'Higiene', 'Fralda líder de mercado.', false, '789101100076'),
('Huggies Turma da Mônica', 'Kimberly', 'Fralda', 'Higiene', 'Proteção dia e noite.', false, '789101100077'),
('Nan Comfor 1', 'Nestlé', 'Fórmula', 'Nutrição', 'Leite para lactentes.', false, '789101100078'),
('Aptamil Profutura 1', 'Danone', 'Fórmula', 'Nutrição', 'Fórmula premium.', false, '789101100079'),
('Johnson Shampoo Baby', 'Johnson', 'Shampoo', 'Higiene', 'Chega de lágrimas.', false, '789101100080'),

-- OUTROS POPULARES
('Engov', 'Hypera', 'Maleato de Mepiramina', 'Hepatoprotetor', 'Para ressaca.', false, '789101100081'),
('Epocler', 'Hypera', 'Citrato de Colina', 'Hepatoprotetor', 'Boldo para o fígado.', false, '789101100082'),
('Salonpas Adesivo', 'Hisamitsu', 'Salicilato de Metila', 'Tópico', 'Adesivo para dor muscular.', false, '789101100083'),
('Benegrip', 'Hypera', 'Dipirona + Cafeína', 'Antigripal', 'Para gripe e resfriado.', false, '789101100084'),
('Cimegripe', 'Cimed', 'Paracetamol', 'Antigripal', 'Barato e eficaz.', false, '789101100085'),
('Resfenol', 'Kley Hertz', 'Paracetamol', 'Antigripal', 'Combate sintomas da gripe.', false, '789101100086'),
('Vick Pyrena', 'P&G', 'Paracetamol', 'Antigripal', 'Chá para gripe.', false, '789101100087'),
('Coristina D', 'Mantecorp', 'AAS + Cafeína', 'Antigripal', 'Descongestiona e tira a dor.', false, '789101100088'),
('Strepsils', 'Reckitt', 'Flurbiprofeno', 'Pastilha', 'Alívio da dor de garganta.', false, '789101100089'),
('Fralda Geriátrica Plenitud', 'Kimberly', 'Fralda', 'Higiene', 'Proteção para adultos.', false, '789101100090'),
('Preservativo Jontex', 'Reckitt', 'Preservativo', 'Sexualidade', 'Lubrificado clássico.', false, '789101100091'),
('Lubrificante KY', 'Reckitt', 'Gel', 'Sexualidade', 'Base de água.', false, '789101100092'),
('Teste Gravidez Clearblue', 'Clearblue', 'Teste', 'Diagnóstico', 'Resultado em 1 minuto.', false, '789101100093'),
('Bismu-Jet', 'Neo Química', 'Neomicina', 'Garganta', 'Spray para garganta inflamada.', false, '789101100094'),
('Gino-Canesten', 'Bayer', 'Clotrimazol', 'Ginecológico', 'Tratamento de candidíase.', true, '789101100095'),
('Flogoral Spray', 'Aché', 'Benzidamina', 'Garganta', 'Anestésico e anti-inflamatório.', false, '789101100096'),
('Albendazol 400mg', 'Prati', 'Albendazol', 'Antiparasitário', 'Contra vermes.', true, '789101100097'),
('Ivermectina 6mg', 'Vitamedic', 'Ivermectina', 'Antiparasitário', 'Contra piolho e sarna.', true, '789101100098'),
('Hirudoid 300', 'Takeda', 'Polissulfato de Mucopolissacarídeo', 'Tópico', 'Para hematomas e varizes.', false, '789101100099'),
('Xilocaína Pomada', 'Aspen', 'Lidocaína', 'Anestésico', 'Alívio da dor local.', false, '789101100100')

ON CONFLICT (ean) DO UPDATE 
SET name = EXCLUDED.name, 
    brand = EXCLUDED.brand, 
    category = EXCLUDED.category,
    active_ingredient = EXCLUDED.active_ingredient;
