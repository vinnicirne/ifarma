-- ===============================================================
-- CRIAR TABELA DE ENDEREÇOS DO USUÁRIO (Corrigir erro 404)
-- ===============================================================

CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT, -- Apelido: Casa, Trabalho
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Usuários veem seus próprios endereços" 
ON public.user_addresses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários salvam seus endereços" 
ON public.user_addresses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários editam seus endereços" 
ON public.user_addresses FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários apagam seus endereços" 
ON public.user_addresses FOR DELETE 
USING (auth.uid() = user_id);

-- (Agora o app vai conseguir salvar!)
