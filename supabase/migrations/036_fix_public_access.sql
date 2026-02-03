-- ==============================================================================
-- CORREÇÃO FINAL DE VISIBILIDADE (IFARMA)
-- Data: 29/01/2026
-- Descrição: Libera leitura de Farmácias (Público) e Pedidos (Donos).
-- ==============================================================================

-- 1. FARMÁCIAS (PHARMACIES)
-- Elas precisam ser públicas para que o app do Cliente funcione e para que o RLS de pedidos funcione.
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Lojista ve sua farmacia" ON pharmacies; -- Remove duplicata restrita se houver

CREATE POLICY "Public pharmacies" ON pharmacies 
    FOR SELECT USING (true);

-- 2. LOJISTA PODE EDITAR SUA FARMACIA
CREATE POLICY "Lojista edita sua farmacia" ON pharmacies
    FOR UPDATE USING (owner_id = auth.uid());

-- 3. PEDIDOS (ORDERS) - REFORÇO
-- Se a leitura da farmácia falhava, isso aqui falhava também. Agora deve funcionar.
DROP POLICY IF EXISTS "Lojistas veem seus proprios pedidos" ON orders;

CREATE POLICY "Lojistas veem seus proprios pedidos" ON orders
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- 4. ORDER ITEMS - REFORÇO
DROP POLICY IF EXISTS "Lojistas veem seus proprios itens" ON order_items;

CREATE POLICY "Lojistas veem seus proprios itens" ON order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders WHERE pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            )
        )
    );

-- 5. CONFIGURAÇÕES DE PAGAMENTO - REFORÇO
DROP POLICY IF EXISTS "Leitura publica configs" ON pharmacy_payment_settings;
CREATE POLICY "Leitura publica configs" ON pharmacy_payment_settings FOR SELECT USING (true);
