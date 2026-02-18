-- ============================================
-- FIX RLS SIMPLES - GESTÃO DE EQUIPE
-- Correção rápida para problemas de permissão
-- ============================================

-- 🚨 PROBLEMA: RLS bloqueando acesso ao próprio perfil e equipe

-- ✅ SOLUÇÃO 1: Desabilitar RLS temporariamente (para teste)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ✅ SOLUÇÃO 2: Reabilitar com policies simples
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ✅ SOLUÇÃO 3: Policies básicas que funcionam
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem ver equipe" ON profiles;
CREATE POLICY "Usuários podem ver equipe" ON profiles
    FOR SELECT USING (
        auth.uid() = id  -- Próprio perfil
        OR 
        (pharmacy_id IS NOT NULL AND pharmacy_id IN (
            SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
        ))  -- Mesma farmácia
    );

DROP POLICY IF EXISTS "Usuários podem atualizar perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar perfil" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ✅ SOLUÇÃO 4: Adicionar campos faltantes (se não existirem)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id),
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT;

-- ✅ SOLUÇÃO 5: Atualizar CHECK constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('customer', 'merchant', 'manager', 'staff', 'motoboy', 'admin'));

-- ✅ SOLUÇÃO 6: Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_pharmacy_id ON public.profiles(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ✅ VERIFICAÇÃO FINAL
SELECT 
    'RLS Policies criadas com sucesso!' as resultado,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as total_policies;

-- 📝 INSTRUÇÕES:
-- 1. Execute este SQL no Supabase Dashboard
-- 2. Recarregue a página /gestor/equipe
-- 3. Verifique o console do navegador
-- 4. Se ainda houver erros, contate o suporte
