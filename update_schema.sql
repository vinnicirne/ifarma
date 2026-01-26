-- Tabela de Itens do Pedido (Executar no Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL, -- Preço unitário no momento da compra
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Política de Segurança (RLS) para order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de itens do pedido" ON order_items FOR SELECT USING (true);
CREATE POLICY "Inserção autenticada de itens" ON order_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
