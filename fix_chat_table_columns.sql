-- Adicionar colunas faltantes na tabela de mensagens do chat
ALTER TABLE public.order_messages 
ADD COLUMN IF NOT EXISTS sender_role TEXT,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Garantir que as permissões RLS permitam inserir e ler mensagens
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages of their orders" ON public.order_messages;
CREATE POLICY "Users can view messages of their orders" 
ON public.order_messages FOR SELECT 
USING (
  auth.uid() = sender_id OR 
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_messages.order_id AND 
    (customer_id = auth.uid() OR motoboy_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert messages to their orders" ON public.order_messages;
CREATE POLICY "Users can insert messages to their orders" 
ON public.order_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Recarregar schema
NOTIFY pgrst, 'reload schema';
