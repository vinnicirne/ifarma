-- 1. Tabela de Múltiplos Endereços
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- Ex: 'Casa', 'Trabalho', 'Namorada'
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Histórico de Rotas (Para o rastreamento do motoboy)
CREATE TABLE IF NOT EXISTS public.route_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motoboy_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para Endereços
CREATE POLICY "Usuários podem gerenciar seus próprios endereços"
ON public.user_addresses
FOR ALL
USING (auth.uid() = user_id);

-- 5. Políticas para Histórico de Rotas
CREATE POLICY "Motoboys podem inserir seu próprio histórico"
ON public.route_history
FOR INSERT
WITH CHECK (auth.uid() = motoboy_id);

CREATE POLICY "Clientes podem ver histórico de motoboys vinculados aos seus pedidos"
ON public.route_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.motoboy_id = route_history.motoboy_id
        AND o.user_id = auth.uid()
        AND o.status IN ('preparando', 'em_rota')
    )
);

-- 6. Garantir que apenas um endereço seja default por usuário
CREATE OR REPLACE FUNCTION handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.user_addresses
        SET is_default = false
        WHERE user_id = NEW.user_id AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_default_address
BEFORE INSERT OR UPDATE ON public.user_addresses
FOR EACH ROW EXECUTE FUNCTION handle_default_address();
