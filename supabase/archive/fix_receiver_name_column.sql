-- Adicionar coluna para nome de quem recebeu o pedido
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS receiver_name TEXT;

-- Garantir que as colunas de telemetria existam (reforço)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS is_charging BOOLEAN,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE;

-- Recarregar cache
NOTIFY pgrst, 'reload schema';
