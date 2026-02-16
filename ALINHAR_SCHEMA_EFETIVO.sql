-- ========================================================
-- IFARMA: HARMONIZAÇÃO DE SCHEMA (FIX ACCESS & EDGE FUNCTIONS)
-- Alinea as tabelas com o que o código espera
-- ========================================================

BEGIN;

-- 1. Harmonizar tabela PHARMACIES
ALTER TABLE public.pharmacies
    ADD COLUMN IF NOT EXISTS owner_name TEXT,
    ADD COLUMN IF NOT EXISTS owner_phone TEXT,
    ADD COLUMN IF NOT EXISTS owner_email TEXT,
    ADD COLUMN IF NOT EXISTS cnpj TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ;

-- 2. Harmonizar tabela PROFILES
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id);

-- 3. Restaurar Acesso da Farmácia Específica
-- Isso resolve o erro de "Acesso Restrito" para farmacia2255@gmail.com
DO $$
DECLARE
    v_pharm_id UUID;
    v_user_id UUID;
BEGIN
    -- Localiza a farmácia pelo e-mail
    SELECT id INTO v_pharm_id FROM pharmacies WHERE owner_email = 'farmacia2255@gmail.com' OR email = 'farmacia2255@gmail.com' LIMIT 1;
    
    -- Localiza o perfil pelo e-mail
    SELECT id INTO v_user_id FROM profiles WHERE email = 'farmacia2255@gmail.com';

    IF v_user_id IS NOT NULL AND v_pharm_id IS NOT NULL THEN
        UPDATE public.profiles
        SET 
          role = 'merchant',
          pharmacy_id = v_pharm_id
        WHERE id = v_user_id;

        UPDATE public.pharmacies
        SET owner_id = v_user_id, owner_email = 'farmacia2255@gmail.com'
        WHERE id = v_pharm_id;
    END IF;
END $$;

COMMIT;

-- 4. Verificação Final básica
SELECT id, email, role, pharmacy_id FROM profiles WHERE email = 'farmacia2255@gmail.com';
