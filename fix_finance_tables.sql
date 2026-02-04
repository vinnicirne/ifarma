-- ===============================================================
-- CORREÇÃO DO MÓDULO FINANCEIRO (TABELAS FALTANTES)
-- ===============================================================

-- 1. Regras de Cobrança por Farmácia
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

-- 2. Histórico de Transações (Extrato)
CREATE TABLE IF NOT EXISTS pharmacy_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id),
    order_id TEXT, 
    order_value DECIMAL(10,2) DEFAULT 0,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    type TEXT, -- 'free', 'fee', 'subscription'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Configurações Globais do Sistema (Fallback)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT
);

-- Permitir que o 'Dono' da farmácia veja e edite suas taxas
ALTER TABLE pharmacy_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fees Access" ON pharmacy_fees
    FOR ALL
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_fees.pharmacy_id)
        OR 
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

ALTER TABLE pharmacy_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transactions Access" ON pharmacy_transactions
    FOR SELECT
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_transactions.pharmacy_id)
        OR 
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- Grants básicos
GRANT ALL ON pharmacy_fees TO authenticated;
GRANT ALL ON pharmacy_transactions TO authenticated;
GRANT ALL ON system_settings TO authenticated;
GRANT ALL ON pharmacy_fees TO service_role;
GRANT ALL ON pharmacy_transactions TO service_role;

-- Inserir Defaults Globais se não existirem
INSERT INTO system_settings (key, value) VALUES 
('global_charge_per_order', 'false'),
('global_fixed_fee', '0.00'),
('global_charge_percentage', 'false'),
('global_percentage_fee', '0.00')
ON CONFLICT DO NOTHING;

-- (Tabelas Financeiras Criadas com Sucesso!)
