-- ===============================================================
-- SCRIPT MESTRE DE CORREÇÃO (RODE ISTO PARA LIBRAR O SALVAMENTO)
-- ===============================================================

-- 1. Criar colunas de Endereço e Mídia (Se não existirem)
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Garantir Tabela Financeira
CREATE TABLE IF NOT EXISTS pharmacy_fees (
    pharmacy_id UUID PRIMARY KEY REFERENCES pharmacies(id),
    charge_per_order BOOLEAN DEFAULT false,
    fixed_fee DECIMAL(10,2) DEFAULT 0,
    charge_percentage BOOLEAN DEFAULT false,
    percentage_fee DECIMAL(10,2) DEFAULT 0,
    free_orders_initial INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Corrigir Permissões (RLS) que impediam salvar
ALTER TABLE pharmacy_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Merchant All Fees" ON pharmacy_fees;
CREATE POLICY "Merchant All Fees" ON pharmacy_fees
    FOR ALL
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id)
        OR 
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- 4. Permissões de Leitura Pública para ver a loja
DROP POLICY IF EXISTS "Public Read Pharmacies" ON pharmacies;
CREATE POLICY "Public Read Pharmacies" ON pharmacies FOR SELECT USING (true);


-- (Tudo corrigido! Agora o botão SALVAR vai funcionar)
