DO $$
DECLARE
    target_email TEXT := '21973111244@motoboy.ifarma.com'; -- Email pego do print
    v_user_id UUID;
BEGIN
    -- 1. Pega o ID do usuário Izabelle
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário % não encontrado!', target_email;
    END IF;

    -- 2. Garante que o perfil existe e é Motoboy
    INSERT INTO public.profiles (id, email, full_name, role, is_active, is_online)
    VALUES (
        v_user_id, 
        target_email, 
        'Izabelle', 
        'motoboy', 
        true, 
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'motoboy',
        is_active = true;

    -- 3. REFORÇA as permissões (RLS)
    alter table public.profiles enable row level security;

    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

    RAISE NOTICE 'Sucesso! Usuário Izabelle (ID %) corrigido e autorizado.', v_user_id;
END $$;
