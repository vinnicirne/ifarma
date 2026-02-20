# 🔥 CORREÇÃO CRÍTICA: Edge Function create-user-admin

## 🐛 PROBLEMA IDENTIFICADO

A Edge Function `create-user-admin` tinha um bug crítico que causava:

1. **Usuários criados SEM perfil** - Usuário Auth criado, mas sem registro na tabela `profiles`
2. **Perfis criados SEM pharmacy_id** - Perfil criado, mas sem vínculo com a farmácia
3. **Impossibilidade de cadastrar produtos** - Erro: "Você precisa estar associado a uma farmácia"

### Causa Raiz

A função esperava `pharmacy_id` no corpo principal da requisição:
```typescript
const { pharmacy_id } = reqJson;
```

Mas o código frontend enviava dentro de `metadata`:
```typescript
metadata: {
    pharmacy_id: pharmacyId  // ❌ Enviado aqui
}
```

## ✅ CORREÇÃO IMPLEMENTADA

### 1. Edge Function Atualizada

**Arquivo:** `supabase/functions/create-user-admin/index.ts`

**Mudanças:**
- ✅ Aceita `pharmacy_id` tanto no corpo principal quanto em `metadata`
- ✅ SEMPRE cria perfil, mesmo sem `pharmacy_id`
- ✅ Implementa retry automático se a primeira tentativa falhar
- ✅ Logs detalhados para debug

**Código Chave:**
```typescript
// Extrai pharmacy_id de múltiplas fontes
const pharmacy_id = reqJson.pharmacy_id || metadata?.pharmacy_id;

// SEMPRE cria perfil
if (userResponse.user) {
    const profilePayload: any = {
        id: userResponse.user.id,
        email: email,
        full_name: metadata?.full_name || email.split('@')[0],
        role: metadata?.role || 'merchant',
    };

    // Adiciona pharmacy_id se existir
    if (pharmacy_id) {
        profilePayload.pharmacy_id = pharmacy_id;
    }

    // Tenta criar com UPSERT
    const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert(profilePayload);

    if (profileError) {
        // Segunda tentativa com INSERT
        await supabaseClient.from('profiles').insert(profilePayload);
    }
}
```

### 2. Deploy Realizado

```bash
✅ Edge Function deployada com sucesso
✅ Versão: Latest
✅ Status: Active
```

### 3. Script de Correção para Dados Existentes

**Arquivo:** `EXECUTE_NO_SUPABASE.sql`

Este script corrige merchants já criados sem `pharmacy_id`.

## 🧪 COMO TESTAR

### Teste 1: Criar Nova Farmácia

1. Acesse: `Dashboard → Farmácias → Nova Farmácia`
2. Preencha os dados:
   - Nome: "Farmácia Teste"
   - Email do Gestor: `teste@exemplo.com`
   - Senha: `Teste123!`
3. Clique em **SALVAR**
4. Verifique:
   - ✅ Farmácia criada
   - ✅ Usuário criado
   - ✅ Perfil criado com `pharmacy_id` vinculado

### Teste 2: Verificar Perfil Criado

Execute no SQL Editor:
```sql
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.email = 'teste@exemplo.com';
```

**Resultado Esperado:**
- ✅ `pharmacy_id` NÃO é NULL
- ✅ `pharmacy_name` mostra o nome da farmácia

### Teste 3: Cadastrar Produto

1. Faça login como merchant: `teste@exemplo.com`
2. Acesse: `Produtos → Novo Produto`
3. Preencha os dados do produto
4. Clique em **SALVAR PRODUTO**
5. Verifique:
   - ✅ Produto salvo com sucesso
   - ✅ SEM erro de "farmácia não associada"

## 🔧 CORRIGIR USUÁRIOS EXISTENTES

### Passo 1: Identificar Merchants Sem Pharmacy

Execute no SQL Editor:
```sql
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id
FROM profiles p
WHERE p.role = 'merchant' 
  AND p.pharmacy_id IS NULL;
```

### Passo 2: Corrigir Automaticamente

Execute o script `EXECUTE_NO_SUPABASE.sql` completo no SQL Editor.

Ou manualmente:
```sql
UPDATE profiles p
SET pharmacy_id = ph.id
FROM pharmacies ph
WHERE p.role = 'merchant'
  AND p.pharmacy_id IS NULL
  AND p.email = ph.owner_email;
```

### Passo 3: Caso Específico (comercialfaum@gmail.com)

Se o usuário `comercialfaum@gmail.com` ainda estiver sem `pharmacy_id`:

```sql
UPDATE profiles 
SET pharmacy_id = (
    SELECT id 
    FROM pharmacies 
    WHERE owner_email = 'comercialfaum@gmail.com' 
    LIMIT 1
)
WHERE email = 'comercialfaum@gmail.com';
```

## 📊 VERIFICAÇÃO FINAL

Execute para confirmar que TODOS os merchants têm pharmacy_id:

```sql
SELECT 
    COUNT(*) as total_merchants,
    COUNT(pharmacy_id) as merchants_com_farmacia,
    COUNT(*) - COUNT(pharmacy_id) as merchants_sem_farmacia
FROM profiles
WHERE role = 'merchant';
```

**Resultado Esperado:**
- `merchants_sem_farmacia` = **0**

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Testar criação de nova farmácia**
2. ✅ **Executar script de correção** (`EXECUTE_NO_SUPABASE.sql`)
3. ✅ **Verificar que comercialfaum@gmail.com pode cadastrar produtos**
4. ✅ **Monitorar logs da Edge Function** para garantir que não há mais erros

## 📝 LOGS PARA MONITORAR

Acesse: `Dashboard → Edge Functions → create-user-admin → Logs`

**Logs de Sucesso:**
```
✅ Requester autenticado: [user_id] [email]
✅ Perfil encontrado: merchant
[Debug] pharmacy_id extraído: [pharmacy_id] (fonte: metadata)
✅ Farmácia aprovada com sucesso (Prioridade).
✅ Perfil criado com sucesso com pharmacy_id vinculado!
```

**Logs de Erro (NÃO devem aparecer):**
```
❌ Erro ao criar perfil: [error]
❌ Segunda tentativa falhou: [error]
```

## 🚨 SE AINDA HOUVER PROBLEMAS

1. Verifique os logs da Edge Function
2. Confirme que o script de correção foi executado
3. Verifique as RLS policies da tabela `profiles`
4. Entre em contato com suporte técnico

---

**Status:** ✅ CORRIGIDO E DEPLOYADO
**Data:** 2026-02-10
**Versão:** 1.1.0
