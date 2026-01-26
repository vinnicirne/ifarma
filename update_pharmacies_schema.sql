-- Adicionando colunas para cadastro detalhado de farmácias/parceiros

ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_last_name TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_cpf TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_rg TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_rg_issuer TEXT;

ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS legal_name TEXT; -- Razão Social
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS trade_name TEXT; -- Nome Fantasia (pode ser redundante com 'name', mas bom ter)
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS establishment_phone TEXT; -- Telefone da Loja
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT true;

-- Permitir cadastro público (para novos parceiros se cadastrarem sem login prévio, se desejado)
-- CREATE POLICY "Cadastro público de parceiros" ON pharmacies FOR INSERT WITH CHECK (true);
-- Descomente a linha acima caso queira permitir inserts não autenticados.
