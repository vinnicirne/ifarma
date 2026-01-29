# 🔓 Solução para Erro de Login

## ❌ Problema Identificado

**Erro:** `TypeError: Failed to fetch`

**Causa:** Row Level Security (RLS) no Supabase está bloqueando o acesso à tabela `profiles`.

---

## ✅ Solução Rápida (Teste)

Execute este SQL no Supabase para **desabilitar RLS temporariamente**:

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

**Depois:**
1. Recarregue a página de login
2. Tente fazer login novamente
3. Deve funcionar!

---

## ✅ Solução Permanente (Recomendada)

Execute este SQL para **configurar políticas de RLS corretas**:

```sql
-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Permitir que todos vejam perfis
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Permitir que usuários criem seu próprio perfil
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Permitir que usuários atualizem seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Apenas admins podem deletar
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## 📋 Passo a Passo

### 1. Acessar Supabase
- https://supabase.com/dashboard/project/ztxdqzqmfwgdnqpwfqwf

### 2. Ir para SQL Editor
- Menu lateral → **SQL Editor**

### 3. Executar Script
- Cole o SQL acima
- Clique em **Run**

### 4. Testar Login
- Recarregue: http://localhost:5176/
- Faça login com: viniciuscirne@gmail.com
- Deve funcionar! ✅

---

## 🔍 Verificar se Funcionou

Execute este SQL:

```sql
-- Ver políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Testar acesso
SELECT * FROM profiles LIMIT 5;
```

---

## 🚨 Se Ainda Não Funcionar

### Opção 1: Desabilitar RLS em TODAS as tabelas

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE motoboys DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens DISABLE ROW LEVEL SECURITY;
```

### Opção 2: Verificar CORS

No Supabase Dashboard:
1. Settings → API
2. Verifique se `localhost` está permitido

---

## ✅ Resultado Esperado

Após executar o script:
- ✅ Login funciona
- ✅ Página de diagnóstico mostra "success"
- ✅ Você consegue acessar `/dashboard`
- ✅ Perfil admin carrega corretamente
