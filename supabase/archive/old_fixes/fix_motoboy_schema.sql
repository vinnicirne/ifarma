-- ==========================================================
-- CORREÇÃO DE ERROS DO APP MOTOBOY
-- execute este script no Editor SQL do Supabase
-- ==========================================================

-- 1. CORRIGIR: Coluna 'last_online' faltando
-- O erro PGRST204 indica que o frontend tenta atualizar essa coluna, mas ela não existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'last_online'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_online TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Coluna last_online adicionada com sucesso.';
    ELSE
        RAISE NOTICE 'Coluna last_online já existe.';
    END IF;
END
$$;

-- 2. CORRIGIR: Permissões para Motoboys atualizarem sua localização
-- Garantir que o motoboy possa fazer UPDATE em seu próprio perfil
CREATE POLICY "Motoboys podem atualizar seu proprio perfil"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. RECARREGAR CACHE DO SCHEMA
-- Isso força o Supabase a reconhecer as novas colunas imediatamente
NOTIFY pgrst, 'reload config';

-- 4. CONSULTA DE DIAGNÓSTICO FINAL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
AND column_name IN ('last_online', 'is_online', 'current_order_id');
