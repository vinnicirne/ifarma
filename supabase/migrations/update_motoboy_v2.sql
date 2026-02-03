-- ==========================================================
-- ATUALIZAÇÃO DE SCHEMA - MOTOBOY V2
-- Adiciona suporte a telemetria, bateria e sistema de mensagens/buzina
-- ==========================================================

-- 1. TELEMETRIA: Adicionar colunas de bateria e status na tabela 'profiles'
DO $$
BEGIN
    -- Nível da bateria (0-100)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'battery_level') THEN
        ALTER TABLE profiles ADD COLUMN battery_level INTEGER;
    END IF;

    -- Se está carregando (true/false)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_charging') THEN
        ALTER TABLE profiles ADD COLUMN is_charging BOOLEAN DEFAULT false;
    END IF;

    -- Garantir que is_online existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_online') THEN
        ALTER TABLE profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. PEDIDOS: Adicionar timestamp de chegada do motoboy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'motoboy_arrived_at') THEN
        ALTER TABLE orders ADD COLUMN motoboy_arrived_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. MENSAGENS/BUZINA: Criar tabela de mensagens do pedido
-- Usada para o motoboy enviar "Cheguei" (buzina) e outras notificações ao cliente/farmácia
CREATE TABLE IF NOT EXISTS order_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    message_type TEXT NOT NULL, -- Ex: 'horn', 'text', 'system'
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SEGURANÇA (RLS) para order_messages
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- Política: Todos com acesso ao pedido (Motoboy, Cliente, Farmácia) podem ler as mensagens
CREATE POLICY "Ler mensagens do pedido" ON order_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_messages.order_id
            AND (
                o.motoboy_id = auth.uid() OR     -- É o motoboy do pedido
                o.customer_id = auth.uid()       -- É o cliente do pedido
                -- Adicione lógica para Farmácia/Admin se necessário
            )
        )
    );

-- Política: Qualquer usuário autenticado pode inserir mensagens (validação feita via API/App)
CREATE POLICY "Enviar mensagens" ON order_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

-- 5. REALTIME: Publicar tabelas para atualização em tempo real
-- Necessário para o cliente receber a "buzina" instantaneamente
BEGIN;
  -- Verifica se a publicação existe antes de tentar adicionar
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'order_messages') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
      END IF;
      
      -- Garantir que profiles também esteja no realtime para o admin ver bateria/online
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
      END IF;
  END
  $$;
COMMIT;

-- 6. Recarregar Configuração
NOTIFY pgrst, 'reload config';
