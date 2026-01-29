-- Adiciona suporte para Troco em pagamentos em dinheiro
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10, 2);

-- Adiciona campos para Taxa de Entrega, Desconto e Complemento de Endereço
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup'));

-- Garante permissões RLS para settings de pagamento (caso não tenham sido aplicadas)
ALTER TABLE pharmacy_payment_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_payment_settings' AND policyname = 'Public read payment settings') THEN
        CREATE POLICY "Public read payment settings" ON pharmacy_payment_settings FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_payment_settings' AND policyname = 'Merchant manage settings') THEN
        CREATE POLICY "Merchant manage settings" ON pharmacy_payment_settings FOR ALL USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_payment_settings' AND policyname = 'Admin manage settings') THEN
        CREATE POLICY "Admin manage settings" ON pharmacy_payment_settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;
