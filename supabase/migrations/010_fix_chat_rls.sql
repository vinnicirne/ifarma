-- ==========================================================
-- FIX CHAT RLS - Allow Pharmacy Owners to Read/Write Messages
-- ==========================================================

-- 1. Permissão de LEITURA para Farmácias (Donos)
DROP POLICY IF EXISTS "Ler mensagens do pedido" ON order_messages;
CREATE POLICY "Ler mensagens do pedido" ON order_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_messages.order_id
            AND (
                o.motoboy_id = auth.uid() OR                    -- Motoboy do pedido
                o.customer_id = auth.uid() OR                   -- Cliente do pedido
                EXISTS (                                        -- Dono da Farmácia
                    SELECT 1 FROM pharmacies p 
                    WHERE p.id = o.pharmacy_id 
                    AND p.owner_id = auth.uid()
                )
            )
        )
    );

-- 2. Permissão de ESCRITA/INSERT para Farmácias (Donos)
-- A política "Enviar mensagens" padrão verifica apenas se auth.uid() = sender_id.
-- Isso já é suficiente, POIS a aplicação deve garantir que o sender_id seja válido.
-- No entanto, para segurança extra, podemos restringir quem pode enviar para um pedido.

DROP POLICY IF EXISTS "Enviar mensagens" ON order_messages;
CREATE POLICY "Enviar mensagens" ON order_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_messages.order_id
            AND (
                o.motoboy_id = auth.uid() OR
                o.customer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM pharmacies p
                    WHERE p.id = o.pharmacy_id
                    AND p.owner_id = auth.uid()
                )
            )
        )
    );

-- 3. Garantir Realtime para order_messages (caso ainda não esteja)
BEGIN;
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'order_messages') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
      END IF;
  END
  $$;
COMMIT;

NOTIFY pgrst, 'reload config';
