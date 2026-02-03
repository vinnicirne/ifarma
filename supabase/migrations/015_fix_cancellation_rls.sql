-- ==========================================================
-- PERMISSÕES DE CANCELAMENTO DE PEDIDOS
-- ==========================================================

-- 1. Habilitar RLS na tabela orders (garantia)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Política para permitir que o CLIENTE cancele seu próprio pedido
-- (Permite UPDATE no status se o pedido for do usuário)
DROP POLICY IF EXISTS "Clientes podem atualizar seus pedidos" ON orders;
CREATE POLICY "Clientes podem atualizar seus pedidos" 
ON orders FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- 3. Política para permitir que a FARMÁCIA cancele pedidos
-- (Permite UPDATE se o usuário for dono da farmácia do pedido)
DROP POLICY IF EXISTS "Farmacia pode atualizar pedidos" ON orders;
CREATE POLICY "Farmacia pode atualizar pedidos" 
ON orders FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM pharmacies 
        WHERE pharmacies.id = orders.pharmacy_id 
        AND pharmacies.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM pharmacies 
        WHERE pharmacies.id = orders.pharmacy_id 
        AND pharmacies.owner_id = auth.uid()
    )
);

-- 4. Notificar mudança para aplicar efeito imediato
NOTIFY pgrst, 'reload config';
