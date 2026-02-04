-- ===============================================================
-- LIBERAR APROVAÇÃO DE FARMÁCIAS PARA ADMINS
-- ===============================================================

-- 1. Habilitar RLS (caso não esteja)
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

-- 2. Política para permitir que ADMINS atualizem qualquer farmácia (Aprovar/Rejeitar)
DROP POLICY IF EXISTS "Admins can update pharmacies" ON pharmacies;

CREATE POLICY "Admins can update pharmacies"
ON pharmacies
FOR UPDATE
USING (
  -- Verifica se o usuário atual tem a role 'admin' na tabela profiles
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Política para permitir que o Próprio Dono edite sua farmácia (opcional, mas bom)
DROP POLICY IF EXISTS "Owners can update own pharmacy" ON pharmacies;

CREATE POLICY "Owners can update own pharmacy"
ON pharmacies
FOR UPDATE
USING (
  owner_id = auth.uid() -- Se o ID do dono bater com o usuário logado
);

-- 4. Garantia para a Edge Function (Service Role)
GRANT ALL ON TABLE pharmacies TO service_role;

-- 5. Confirmação
SELECT 'Permissões de aprovação aplicadas com sucesso!' as result;
