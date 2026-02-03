-- Script para corrigir RLS (Row Level Security) no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Desabilitar RLS temporariamente para testar
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Ou criar políticas corretas (recomendado)
-- Primeiro, habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (qualquer um pode ler perfis)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Política para INSERT (usuários podem criar seu próprio perfil)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Política para UPDATE (usuários podem atualizar seu próprio perfil)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Política para DELETE (apenas admins podem deletar)
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Verificar se funcionou
SELECT * FROM profiles LIMIT 5;
