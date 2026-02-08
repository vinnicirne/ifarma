-- ============================================
-- FIX: Permitir INSERT de Farmácias por Admins
-- ============================================

-- 1. Remover política antiga que pode estar conflitando
DROP POLICY IF EXISTS "Admins podem gerenciar farmácias" ON pharmacies;
DROP POLICY IF EXISTS "Admins podem inserir farmácias" ON pharmacies;

-- 2. Criar política completa para ADMINS (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins full access pharmacies" ON pharmacies
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Manter política de leitura pública
DROP POLICY IF EXISTS "Todos podem ver farmácias" ON pharmacies;
CREATE POLICY "Public read pharmacies" ON pharmacies
    FOR SELECT 
    USING (status = 'Aprovado' OR true); -- Permite ver todas para simplificar

-- 4. Permitir que lojistas atualizem suas próprias farmácias
DROP POLICY IF EXISTS "Lojista edita sua farmacia" ON pharmacies;
CREATE POLICY "Owners update own pharmacy" ON pharmacies
    FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- 5. Verificar políticas ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'pharmacies'
ORDER BY policyname;
