-- Adicionar coluna para URL do comprovante de entrega na tabela de pedidos
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Adicionar coluna para último status online na tabela de perfis (para o Motoboy)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_online TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signal_status TEXT;

-- Recarregar o cache do schema (o Supabase faz isso automaticamente na alteração, mas garante a consistência)
NOTIFY pgrst, 'reload schema';
