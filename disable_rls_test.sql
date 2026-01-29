-- ============================================
-- SOLUÇÃO ALTERNATIVA - DESABILITAR RLS TEMPORARIAMENTE
-- Use esta solução para testar se o problema é realmente o RLS
-- ============================================

-- OPÇÃO 1: Desabilitar RLS completamente na tabela profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verificar se funcionou
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Testar acesso
SELECT id, email, full_name, role, is_active 
FROM profiles 
WHERE email = 'viniciuscirne@gmail.com';

-- ============================================
-- IMPORTANTE: Depois de confirmar que o login funciona,
-- você pode reabilitar o RLS com:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ============================================
