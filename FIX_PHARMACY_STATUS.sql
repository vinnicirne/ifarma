
-- ============================================
-- CORREÇÃO DE STATUS E RLS DAS FARMÁCIAS
-- ============================================

-- 1. Padronizar status para Capitalizado (Aprovado)
UPDATE pharmacies 
SET status = 'Aprovado' 
WHERE status = 'approved';

-- 2. Garantir que a Política RLS seja Case-Insensitive (para evitar problemas futuros)
DROP POLICY IF EXISTS "Todos podem ver farmácias aprovadas" ON pharmacies;

CREATE POLICY "Todos podem ver farmácias aprovadas" ON pharmacies
    FOR SELECT USING (
        status ILIKE 'aprovado' OR 
        status = 'Aprovado' OR
        owner_id = auth.uid()
    );

-- 3. Verificar Correção
SELECT id, name, status FROM pharmacies WHERE status = 'Aprovado';
