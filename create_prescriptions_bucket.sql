-- Criar o bucket de receitas caso não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para o bucket 'prescriptions'

-- 1. Permitir que qualquer usuário autenticado faça upload (visto que o filtro é feito no app pelo orderId)
DROP POLICY IF EXISTS "Permitir upload de receitas por usuários autenticados" ON storage.objects;
CREATE POLICY "Permitir upload de receitas por usuários autenticados"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'prescriptions' 
    AND auth.role() = 'authenticated'
);

-- 2. Permitir que usuários autenticados vejam as receitas
-- (Idealmente restringiríamos por order_id, mas para chat o público facilita o carregamento)
DROP POLICY IF EXISTS "Permitir leitura de receitas por usuários autenticados" ON storage.objects;
CREATE POLICY "Permitir leitura de receitas por usuários autenticados"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'prescriptions' 
    AND auth.role() = 'authenticated'
);

-- 3. Permitir deleção apenas pelo próprio dono (opcional)
DROP POLICY IF EXISTS "Permitir exclusão pelo dono" ON storage.objects;
CREATE POLICY "Permitir exclusão pelo dono"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'prescriptions' 
    AND auth.uid() = owner
);
