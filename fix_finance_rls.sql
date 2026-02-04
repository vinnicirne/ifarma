-- ===============================================================
-- CORREÇÃO DE PERMISSÕES FINANCEIRAS (RLS)
-- ===============================================================

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Fees Access" ON pharmacy_fees;
DROP POLICY IF EXISTS "Fees viewable by owner" ON pharmacy_fees;
DROP POLICY IF EXISTS "Fees editable by owner" ON pharmacy_fees;
DROP POLICY IF EXISTS "Fees insertable by owner" ON pharmacy_fees;

-- Habilitar RLS
ALTER TABLE pharmacy_fees ENABLE ROW LEVEL SECURITY;

-- 1. Permissão para ADMIN (Acesso Total)
CREATE POLICY "Admin All" ON pharmacy_fees
    FOR ALL
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- 2. Permissão para MERCHANT (Dono da Loja)
-- Leitura
CREATE POLICY "Merchant Select" ON pharmacy_fees
    FOR SELECT
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id)
    );

-- Inserção (Ao criar regras pela primeira vez)
CREATE POLICY "Merchant Insert" ON pharmacy_fees
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id)
    );

-- Atualização
CREATE POLICY "Merchant Update" ON pharmacy_fees
    FOR UPDATE
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id)
    );

-- Garantir acesso a tabela de transações também
DROP POLICY IF EXISTS "Transactions Access" ON pharmacy_transactions;
CREATE POLICY "Transactions Access" ON pharmacy_transactions
    FOR ALL
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id)
        OR 
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- (Permissões corrigidas!)
