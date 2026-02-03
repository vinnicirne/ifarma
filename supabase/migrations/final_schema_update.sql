-- ==============================================================================
-- ATUALIZAÇÃO DO BANCO DE DADOS (IFARMA)
-- Data: 29/01/2026
-- Descrição: Adiciona campos financeiros e de endereço aos pedidos e corrige RLS.
-- ==============================================================================

-- 1. ADICIONAR NOVAS COLUNAS NA TABELA ORDERS
-- Necessário para o "Troco para", "Taxa de Entrega" e "Complemento"
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup'));

-- 2. GARANTIR PERMISSÕES (RLS) PARA ADMINS
-- Isso é CRÍTICO para que a função "Acessar Farmácia" funcione corretamente.
-- O Admin precisa poder ver os pedidos mesmo não sendo o dono da farmácia.

-- Remove política antiga se existir (para evitar duplicação/conflito)
DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON orders;

-- Cria a política correta
CREATE POLICY "Admins podem ver todos os pedidos" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. GARANTIR PERMISSÕES PARA CONFIGURAÇÕES DE PAGAMENTO
ALTER TABLE pharmacy_payment_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Permitir leitura pública (para o Checkout carregar as opções)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_payment_settings' AND policyname = 'Public read payment settings') THEN
        CREATE POLICY "Public read payment settings" ON pharmacy_payment_settings FOR SELECT USING (true);
    END IF;

    -- Permitir que Admins editem qualquer configuração
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_payment_settings' AND policyname = 'Admin manage settings') THEN
        CREATE POLICY "Admin manage settings" ON pharmacy_payment_settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;

     -- Permitir que o Dono da Farmácia edite sua própria configuração
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_payment_settings' AND policyname = 'Merchant manage settings') THEN
        CREATE POLICY "Merchant manage settings" ON pharmacy_payment_settings FOR ALL USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid()));
    END IF;
END $$;
