-- ==============================================================================
-- CORREÇÃO COMPLETA DO CHAT (SCHEMA + RLS)
-- Execute este script para corrigir o erro 400 ao enviar mensagens
-- ==============================================================================

-- 1. ADICIONAR COLUNA PARA ROLE EXPLÍCITO (Solução para Motorista=Cliente nos testes)
-- Permite identificar se a mensagem foi enviada como 'pharmacy', 'customer' ou 'motoboy'
-- Isso resolve a confusão quando o mesmo usuário assume múltiplos papéis.
ALTER TABLE order_messages ADD COLUMN IF NOT EXISTS sender_role TEXT;
-- Opcional: Definir default como NULL ou tratar no frontend
-- A coluna message_type também é garantida
ALTER TABLE order_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';


-- 2. GARANTIR QUE A TABELA EXISTE E TEM A ESTRUTURA CORRETA
CREATE TABLE IF NOT EXISTS order_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    message_type TEXT DEFAULT 'text',
    sender_role TEXT -- Coluna nova adicionada na definição
);


-- 3. RESETAR E REAPLICAR AS POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade ou conflitos
DROP POLICY IF EXISTS "Ler mensagens do pedido" ON order_messages;
DROP POLICY IF EXISTS "Enviar mensagens" ON order_messages;
DROP POLICY IF EXISTS "Clientes podem ver mensagens de seus pedidos" ON order_messages;
DROP POLICY IF EXISTS "Motoboys podem ver mensagens de seus pedidos" ON order_messages;
DROP POLICY IF EXISTS "Farmacia pode ver mensagens" ON order_messages;

-- --- POLÍTICA UNIFICADA DE LEITURA ---
-- Permite que Farmácia, Motoboy e Cliente leiam as mensagens do pedido
CREATE POLICY "Ler mensagens do pedido" ON order_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_messages.order_id
            AND (
                o.motoboy_id = auth.uid() OR                    -- É o motoboy do pedido
                o.customer_id = auth.uid() OR                   -- É o cliente do pedido
                EXISTS (                                        -- É o dono da farmácia
                    SELECT 1 FROM pharmacies p 
                    WHERE p.id = o.pharmacy_id 
                    AND p.owner_id = auth.uid()
                )
            )
        )
    );

-- --- POLÍTICA UNIFICADA DE ESCRITA (INSERT) ---
-- Permite enviar mensagem apenas se for o remetente E tiver acesso ao pedido
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

-- 4. ATUALIZAR REALTIME
-- Garante que as mensagens sejam transmitidas em tempo real
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

-- ==============================================================================
-- DICA: LIMPEZA PARA TESTES (Descomente se quiser limpar o chat)
-- TRUNCATE TABLE order_messages;
-- ==============================================================================
