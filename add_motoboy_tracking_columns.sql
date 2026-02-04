-- Adiciona colunas necessárias para o Motoboy App funcionar sem erro 400
-- Colunas de Bateria e Localização

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS is_charging BOOLEAN,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Garante que o motoboy possa atualizar essas colunas (Update Policy já existe, mas reforçando)
-- As políticas foram definidas em fix_izu_motoboy.sql
