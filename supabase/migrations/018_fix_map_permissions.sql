-- Liberar leitura da tabela 'pharmacies' para usuarios autenticados (Clientes)
-- Isso resolve o problema do Mapa em Branco no rastreamento

ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmácias visíveis para todos" ON pharmacies;

CREATE POLICY "Farmácias visíveis para todos" 
ON pharmacies FOR SELECT 
To authenticated
USING (true);

-- (Tabela addresses removida pois não existe)

-- Garantir leitura de ordens próprias e relacionadas
DROP POLICY IF EXISTS "Ver meus pedidos" ON orders;
CREATE POLICY "Ver meus pedidos" ON orders FOR SELECT USING (
    auth.uid() = customer_id 
    OR auth.uid() = motoboy_id 
    OR EXISTS (SELECT 1 FROM pharmacies WHERE id = orders.pharmacy_id AND owner_id = auth.uid())
);
