-- Adiciona coluna para controlar a ordem de entrega
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_sequence INTEGER DEFAULT 0;

-- Comentário para documentação
COMMENT ON COLUMN public.orders.delivery_sequence IS 'Define a prioridade/ordem de entrega para o motoboy (Menor número = Maior prioridade)';

-- Política (Caso ainda não exista, motoboys já devem poder atualizar seus pedidos)
-- Apenas garantindo que motoboy possa atualizar essa coluna
CREATE POLICY "Motoboys can update delivery sequence of their orders" 
ON public.orders FOR UPDATE 
TO authenticated 
USING (auth.uid() = motoboy_id)
WITH CHECK (auth.uid() = motoboy_id);
