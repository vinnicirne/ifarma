-- Atualizar política de acesso a mensagens do chat para incluir o dono da farmácia
-- Isso permite que a farmácia veja a receita enviada pelo cliente

DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON public.order_messages;
DROP POLICY IF EXISTS "Users can view messages of their orders" ON public.order_messages;

CREATE POLICY "Participantes podem ver mensagens" ON public.order_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        LEFT JOIN public.pharmacies p ON o.pharmacy_id = p.id
        WHERE o.id = order_messages.order_id
        AND (
            o.customer_id = auth.uid() 
            OR o.motoboy_id = auth.uid()
            OR p.owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    )
);

-- Garantir colunas message_type e media_url (já devem existir, mas para segurança)
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Notificar recarregamento do schema
NOTIFY pgrst, 'reload schema';
