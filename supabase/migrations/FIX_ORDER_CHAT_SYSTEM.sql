-- ============================================================================
-- FIX ORDER CHAT SYSTEM (order_messages)
-- Resolution by Backend Specialist
-- ============================================================================

BEGIN;

-- 1. SCHEMA: Add missing columns
DO $$ 
BEGIN
    -- profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='pharmacy_id') THEN
        ALTER TABLE profiles ADD COLUMN pharmacy_id UUID REFERENCES pharmacies(id);
    END IF;

    -- order_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_messages' AND column_name='message_type') THEN
        ALTER TABLE order_messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_messages' AND column_name='sender_role') THEN
        ALTER TABLE order_messages ADD COLUMN sender_role TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_messages' AND column_name='media_url') THEN
        ALTER TABLE order_messages ADD COLUMN media_url TEXT;
    END IF;
END $$;

-- 2. REALTIME: Enable
ALTER TABLE order_messages REPLICA IDENTITY FULL;
-- We don't drop the publication, just try to add if missing (idempotent way)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'order_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
    END IF;
END $$;

-- 3. SECURITY (RLS): Atomic Fix
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order chat visibility" ON order_messages;
DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON order_messages;
DROP POLICY IF EXISTS "Usuários veem mensagens de seus pedidos" ON order_messages;

CREATE POLICY "Order chat visibility"
ON public.order_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM orders o
    LEFT JOIN pharmacies p ON p.id = o.pharmacy_id
    WHERE o.id = order_messages.order_id
    AND (
      o.customer_id = auth.uid() OR 
      o.motoboy_id = auth.uid() OR
      p.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles pf WHERE pf.id = auth.uid() AND pf.pharmacy_id = o.pharmacy_id)
    )
  )
);

DROP POLICY IF EXISTS "Order chat insertion" ON order_messages;
DROP POLICY IF EXISTS "Participantes podem enviar mensagens" ON order_messages;
DROP POLICY IF EXISTS "Usuários podem enviar mensagens em seus pedidos" ON order_messages;

CREATE POLICY "Order chat insertion"
ON public.order_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM orders o
    LEFT JOIN pharmacies p ON p.id = o.pharmacy_id
    WHERE o.id = order_id
    AND (
      o.customer_id = auth.uid() OR 
      o.motoboy_id = auth.uid() OR
      p.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles pf WHERE pf.id = auth.uid() AND pf.pharmacy_id = o.pharmacy_id)
    )
  )
);

COMMIT;

-- 4. VERIFICATION
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_messages';
