-- HOTFIX: Adicionando colunas de Complemento e Observações do Cliente na tabela de Pedidos
-- Execute este script no SQL Editor do Supabase para corrigir o erro de checkout.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS complement TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS neighborhood TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;

-- Opcional: Se quiser garantir que o PostgREST atualize o cache imediatamente
-- NOTIFY pgrst, 'reload schema';
