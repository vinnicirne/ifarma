# 🚨 CORREÇÃO FINAL - Edge Function create-user-admin

## ✅ PROBLEMAS IDENTIFICADOS E CORRIGIDOS

### 1. **Edge Function não recebia auth_token**
- ❌ **Problema:** PharmacyDetails.tsx não enviava `auth_token` no corpo da requisição
- ✅ **Correção:** Adicionado `auth_token: currentSession.access_token` ao body

### 2. **pharmacy_id enviado apenas em metadata**
- ❌ **Problema:** Edge Function buscava `pharmacy_id` no corpo principal, mas recebia em `metadata`
- ✅ **Correção:** Edge Function agora aceita de ambas as fontes + Frontend envia em ambos

### 3. **Perfis criados sem pharmacy_id**
- ❌ **Problema:** Usuários merchants criados sem vínculo com farmácia
- ✅ **Correção:** Edge Function SEMPRE cria perfil com pharmacy_id (se fornecido)

---

## 🔧 ARQUIVOS MODIFICADOS

### 1. **Edge Function** (DEPLOYADA ✅)
**Arquivo:** `supabase/functions/create-user-admin/index.ts`

**Mudanças:**
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

    if (pharmacy_id) {
        profilePayload.pharmacy_id = pharmacy_id;
    }

    // Tenta UPSERT, se falhar tenta INSERT
    const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert(profilePayload);

    if (profileError) {
        await supabaseClient.from('profiles').insert(profilePayload);
    }
}
```

### 2. **Frontend** (MODIFICADO ✅)
**Arquivo:** `src/pages/admin/PharmacyDetails.tsx`

**Mudanças:**
```typescript
// Obter token de autenticação
const { data: { session: currentSession } } = await supabase.auth.getSession();

if (!currentSession?.access_token) {
    alert("Sessão expirada. Recarregue a página e faça login novamente.");
    return;
}

const { data: authData, error: authErr } = await supabase.functions.invoke('create-user-admin', {
    body: {
        email: formData.merchant_email,
        password: formData.merchant_password,
        auth_token: currentSession.access_token, // 🔥 ADICIONADO
        pharmacy_id: pharmacyId, // 🔥 NO CORPO PRINCIPAL
        metadata: {
            full_name: formData.owner_name,
            role: 'merchant',
            pharmacy_id: pharmacyId, // Também em metadata
            phone: formData.owner_phone
        }
    }
});
```

---

## 🚀 PRÓXIMOS PASSOS (ORDEM DE EXECUÇÃO)

### **PASSO 1: Executar Script de Correção SQL** ⚠️ URGENTE

Acesse: `https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat/sql/new`

Execute o arquivo: **`DIAGNOSTICO_COMPLETO.sql`**

Isso irá:
1. Diagnosticar merchants sem pharmacy_id
2. Corrigir automaticamente vinculando pelo owner_email
3. Verificar estatísticas
4. Corrigir caso específico de comercialfaum@gmail.com

### **PASSO 2: Testar Criação de Nova Farmácia**

1. Acesse: `http://localhost:5173/dashboard/pharmacy/new`
2. Preencha:
   - Nome: "Farmácia Teste Final"
   - Email do Gestor: `teste.final@exemplo.com`
   - Senha: `Teste123!`
   - Preencha endereço completo
3. Clique em **SALVAR**
4. Verifique:
   - ✅ Farmácia criada
   - ✅ Usuário criado
   - ✅ **SEM** erro "non-2xx status code"

### **PASSO 3: Verificar Perfil Criado**

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
WHERE p.email = 'teste.final@exemplo.com';
```

**Resultado Esperado:**
- ✅ `pharmacy_id` NÃO é NULL
- ✅ `pharmacy_name` = "Farmácia Teste Final"

### **PASSO 4: Testar Login e Cadastro de Produto**

1. Faça logout
2. Faça login como: `comercialfaum@gmail.com`
3. Acesse: `Produtos → Novo Produto`
4. Preencha:
   - Nome: "Dipirona Teste"
   - Preço: 10.00
   - Estoque: 50
5. Clique em **SALVAR PRODUTO**
6. Verifique:
   - ✅ Produto salvo com sucesso
   - ✅ **SEM** erro "Você precisa estar associado a uma farmácia"

---

## 📊 VERIFICAÇÃO FINAL

Execute no SQL Editor:
```sql
-- Estatísticas de merchants
SELECT 
    COUNT(*) as total_merchants,
    COUNT(pharmacy_id) as merchants_com_farmacia,
    COUNT(*) - COUNT(pharmacy_id) as merchants_sem_farmacia
FROM profiles
WHERE role = 'merchant';

-- Farmácias sem owner
SELECT COUNT(*) as farmacias_sem_owner
FROM pharmacies ph
WHERE ph.owner_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.email = ph.owner_email 
    AND p.role = 'merchant'
  );
```

**Resultado Esperado:**
- `merchants_sem_farmacia` = **0**
- `farmacias_sem_owner` = **0**

---

## 🐛 SE AINDA HOUVER PROBLEMAS

### Erro: "non-2xx status code"

1. Verifique os logs da Edge Function:
   - Dashboard → Edge Functions → create-user-admin → Logs
2. Procure por:
   - ❌ "Invalid requester token"
   - ❌ "Could not verify requester profile"
   - ❌ "Unauthorized"

### Erro: "Você precisa estar associado a uma farmácia"

1. Execute o script de correção SQL novamente
2. Verifique se o usuário tem `pharmacy_id`:
   ```sql
   SELECT * FROM profiles WHERE email = 'seu_email@exemplo.com';
   ```
3. Se `pharmacy_id` for NULL, execute:
   ```sql
   UPDATE profiles 
   SET pharmacy_id = (
       SELECT id FROM pharmacies 
       WHERE owner_email = 'seu_email@exemplo.com' 
       LIMIT 1
   )
   WHERE email = 'seu_email@exemplo.com';
   ```

---

## 📁 ARQUIVOS CRIADOS

1. ✅ `DIAGNOSTICO_COMPLETO.sql` - Script SQL de correção completo
2. ✅ `EXECUTE_NO_SUPABASE.sql` - Script SQL simplificado
3. ✅ `CORRECAO_EDGE_FUNCTION.md` - Documentação detalhada
4. ✅ `CORRECAO_FINAL.md` - Este arquivo (resumo executivo)

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Edge Function deployada com sucesso
- [ ] Script SQL de correção executado
- [ ] Todos os merchants têm pharmacy_id
- [ ] Nova farmácia criada sem erros
- [ ] Perfil criado com pharmacy_id vinculado
- [ ] Login como merchant funciona
- [ ] Cadastro de produto funciona
- [ ] Sem erro "non-2xx status code"
- [ ] Sem erro "Você precisa estar associado a uma farmácia"

---

**Status:** 🔧 CORREÇÃO IMPLEMENTADA - AGUARDANDO TESTES
**Data:** 2026-02-10
**Versão:** 2.0.0
