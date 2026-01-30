-- ==========================================================
-- CORRECÇÃO FINAL SCHEMA MOTOBOY (VERSÃO CORRIGIDA)
-- execute este script no Editor SQL do Supabase
-- ==========================================================

-- 1. ADICIONAR COLUNAS QUE FALTAM NA TABELA PROFILES
DO $$
BEGIN
    -- signal_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'signal_status') THEN
        ALTER TABLE profiles ADD COLUMN signal_status TEXT;
    END IF;

    -- battery_level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'battery_level') THEN
        ALTER TABLE profiles ADD COLUMN battery_level INTEGER;
    END IF;

    -- last_lat
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_lat') THEN
        ALTER TABLE profiles ADD COLUMN last_lat DOUBLE PRECISION;
    END IF;

    -- last_lng
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_lng') THEN
        ALTER TABLE profiles ADD COLUMN last_lng DOUBLE PRECISION;
    END IF;
END
$$;

-- 2. GARANTIR QUE A TABELA LOCATION_HISTORY EXISTA (FALLBACK)
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motoboy_id UUID REFERENCES profiles(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERMISSÕES RLS PARA LOCATION_HISTORY
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Motoboys podem inserir historico') THEN
        CREATE POLICY "Motoboys podem inserir historico"
        ON location_history FOR INSERT
        WITH CHECK (auth.uid() = motoboy_id);
    END IF;
END
$$;

-- 4. RECARREGAR CONFIG
NOTIFY pgrst, 'reload config';

-- 5. CHECAGEM FINAL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
AND column_name IN ('signal_status', 'battery_level', 'last_lat', 'last_lng', 'last_online');
