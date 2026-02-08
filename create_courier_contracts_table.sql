-- Tabela de Contratos de Motoboys
CREATE TABLE IF NOT EXISTS public.courier_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    
    -- Valores Financeiros (Zero é o padrão se não usado)
    delivery_fee DECIMAL(10,2) DEFAULT 0, -- Taxa por entrega
    fixed_salary DECIMAL(10,2) DEFAULT 0, -- Salário Fixo
    daily_rate DECIMAL(10,2) DEFAULT 0, -- Diária
    
    -- Produtividade
    productivity_goal INTEGER DEFAULT 0, -- Meta de Entregas
    productivity_bonus DECIMAL(10,2) DEFAULT 0, -- Bônus ao atingir meta
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(courier_id, pharmacy_id)
);

-- RLS
ALTER TABLE public.courier_contracts ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins and Managers can view contracts" ON public.courier_contracts;
CREATE POLICY "Admins and Managers can view contracts" ON public.courier_contracts
FOR SELECT USING (
    auth.uid() IN (
        SELECT owner_id FROM pharmacies WHERE id = pharmacy_id
    ) OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    ) OR 
    auth.uid() = courier_id
);

DROP POLICY IF EXISTS "Admins and Pharmacists can manage contracts" ON public.courier_contracts;
CREATE POLICY "Admins and Pharmacists can manage contracts" ON public.courier_contracts
FOR ALL USING (
    auth.uid() IN (
        SELECT owner_id FROM pharmacies WHERE id = pharmacy_id
    ) OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_courier_contracts_updated_at ON public.courier_contracts;
CREATE TRIGGER update_courier_contracts_updated_at
    BEFORE UPDATE ON public.courier_contracts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
