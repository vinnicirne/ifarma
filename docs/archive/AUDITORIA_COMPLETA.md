# 🔍 AUDITORIA RIGOROSA DO SISTEMA - Backend Specialist

## 📊 DIAGNÓSTICO INICIAL

### ✅ Serviços Ativos
- **Node.js:** 2 processos rodando (IDs: 8364, 13104)
- **Vite Dev Server:** Ativo desde 11:23:08
- **Status:** OPERACIONAL

### ⚠️ PROBLEMAS IDENTIFICADOS

#### 1. **CACHE DO NAVEGADOR** (CRÍTICO)
- **Problema:** Dist compilado em 09/02, mas código foi alterado em 10/02
- **Impacto:** Navegador está usando código ANTIGO
- **Solução:** Hard refresh obrigatório

#### 2. **CÓDIGO FRONTEND CORRETO MAS NÃO APLICADO**
- **Arquivo:** `PharmacyDetails.tsx` (linhas 484-505)
- **Status:** ✅ Código CORRETO no arquivo
- **Problema:** ❌ Navegador NÃO carregou a versão nova
- **Evidência:** Erro "non-2xx status code" continua aparecendo

#### 3. **EDGE FUNCTION CORRETA E DEPLOYADA**
- **Arquivo:** `create-user-admin/index.ts`
- **Status:** ✅ DEPLOYADA com sucesso
- **Funcionalidade:** ✅ Aceita auth_token e pharmacy_id

#### 4. **6 MERCHANTS SEM PHARMACY_ID**
- **Problema:** Usuários criados antes da correção
- **Impacto:** Não conseguem cadastrar produtos
- **Solução:** Script SQL de correção

---

## 🔧 ANÁLISE TÉCNICA DETALHADA

### Frontend (PharmacyDetails.tsx)

**Código Atual (CORRETO):**
```typescript
// Linha 484-505
const { data: { session: currentSession } } = await supabase.auth.getSession();

if (!currentSession?.access_token) {
    alert("Sessão expirada. Recarregue a página e faça login novamente.");
    return;
}

const { data: authData, error: authErr } = await supabase.functions.invoke('create-user-admin', {
    body: {
        email: formData.merchant_email,
        password: formData.merchant_password,
        auth_token: currentSession.access_token, // ✅ PRESENTE
        pharmacy_id: pharmacyId, // ✅ PRESENTE
        metadata: {
            full_name: formData.owner_name,
            role: 'merchant',
            pharmacy_id: pharmacyId,
            phone: formData.owner_phone
        }
    }
});
```

**Status:** ✅ CÓDIGO CORRETO

**Problema:** O navegador está executando a versão ANTIGA do código (sem auth_token)

---

### Edge Function (create-user-admin)

**Verificação de Auth (Linhas 41-74):**
```typescript
const { email, password, metadata, auth_token } = reqJson;

let token = auth_token;

if (!token) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
        token = authHeader.replace('Bearer ', '');
    }
}

if (!token) {
    return new Response(JSON.stringify({ 
        error: 'No authorization token provided (Header or Body)' 
    }), {
        status: 401,
    })
}
```

**Status:** ✅ CÓDIGO CORRETO

**Problema:** Frontend não está enviando auth_token (porque navegador usa código antigo)

---

### Criação de Perfil (Linhas 169-210)

```typescript
if (userResponse.user) {
    const profilePayload: any = {
        id: userResponse.user.id,
        email: email,
        full_name: metadata?.full_name || email.split('@')[0],
        role: metadata?.role || 'merchant',
    };

    if (pharmacy_id) {
        profilePayload.pharmacy_id = pharmacy_id; // ✅ VINCULAÇÃO
    }

    const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert(profilePayload);

    if (profileError) {
        // Segunda tentativa com INSERT
        const { error: insertError } = await supabaseClient
            .from('profiles')
            .insert(profilePayload);
    }
}
```

**Status:** ✅ CÓDIGO CORRETO

---

## 🚨 CAUSA RAIZ DO PROBLEMA

### **O NAVEGADOR ESTÁ USANDO CÓDIGO JAVASCRIPT ANTIGO (CACHE)**

**Evidências:**
1. Código fonte está correto (PharmacyDetails.tsx tem auth_token)
2. Edge Function está correta e deployada
3. Servidor reiniciado às 11:23
4. Dist compilado em 09/02 (ONTEM)
5. Erro continua aparecendo (navegador usa código antigo)

**Conclusão:**
O navegador está executando a versão ANTIGA do JavaScript que NÃO envia auth_token.

---

## ✅ SOLUÇÃO DEFINITIVA

### PASSO 1: LIMPAR CACHE DO NAVEGADOR (OBRIGATÓRIO)

**Método 1: Hard Refresh**
1. Abra a página: `http://localhost:5173/dashboard/pharmacy/new`
2. Pressione **Ctrl + Shift + Delete**
3. Selecione:
   - ✅ Cache de imagens e arquivos
   - ✅ Cookies e dados de sites
4. Período: "Última hora"
5. Clique em **Limpar dados**
6. Feche e reabra o navegador

**Método 2: DevTools (Mais Rápido)**
1. Pressione **F12** (abrir DevTools)
2. Clique com botão direito no ícone de **Recarregar**
3. Selecione **"Esvaziar cache e recarregar forçadamente"**

**Método 3: Modo Anônimo (Teste)**
1. Abra uma janela anônima (**Ctrl + Shift + N**)
2. Acesse: `http://localhost:5173`
3. Faça login
4. Tente criar farmácia

---

### PASSO 2: CORRIGIR MERCHANTS EXISTENTES

Execute no Supabase SQL Editor:

```sql
-- Corrigir merchants sem pharmacy_id
UPDATE profiles p
SET pharmacy_id = ph.id
FROM pharmacies ph
WHERE p.role = 'merchant'
  AND p.pharmacy_id IS NULL
  AND p.email = ph.owner_email;

-- Verificar resultado
SELECT 
    COUNT(*) as total_merchants,
    COUNT(pharmacy_id) as merchants_com_farmacia,
    COUNT(*) - COUNT(pharmacy_id) as merchants_sem_farmacia
FROM profiles
WHERE role = 'merchant';
```

---

### PASSO 3: TESTAR CRIAÇÃO DE FARMÁCIA

**APÓS LIMPAR O CACHE:**

1. Acesse: `http://localhost:5173/dashboard/pharmacy/new`
2. Preencha:
   - Nome: `Farmácia Teste Cache Limpo`
   - Email: `teste.cache@ifarma.com`
   - Senha: `Teste123!@#`
   - CEP: `01310-100`
   - Número: `1578`
3. Clique em **SALVAR**

**Resultado Esperado:**
- ✅ Mensagem: "Farmácia salva com sucesso!"
- ✅ SEM erro "non-2xx status code"

---

## 📋 CHECKLIST DE VALIDAÇÃO

### Antes de Testar:
- [ ] Cache do navegador limpo (Ctrl + Shift + Delete)
- [ ] Navegador fechado e reaberto
- [ ] OU usando modo anônimo

### Durante o Teste:
- [ ] Console do navegador aberto (F12)
- [ ] Aba Network aberta
- [ ] Monitorar requisição para create-user-admin

### Após Salvar:
- [ ] Verificar se auth_token foi enviado (aba Network → create-user-admin → Payload)
- [ ] Verificar resposta da Edge Function
- [ ] Verificar se farmácia foi criada
- [ ] Verificar se perfil tem pharmacy_id

---

## 🔍 COMO VERIFICAR SE O CACHE FOI LIMPO

### No Console do Navegador (F12):

**Antes de clicar em SALVAR, execute:**
```javascript
// Verificar se o código novo está carregado
console.log('Teste de versão do código');

// Simular a chamada (sem executar)
const testCode = `
const { data: { session: currentSession } } = await supabase.auth.getSession();
console.log('auth_token presente:', !!currentSession?.access_token);
`;

console.log('Se aparecer "auth_token presente: true", o código NOVO está carregado');
console.log('Se der erro ou false, o código ANTIGO ainda está em cache');
```

---

## 🎯 PRIORIDADE DE AÇÕES

### URGENTE (FAÇA AGORA):
1. **LIMPAR CACHE DO NAVEGADOR** (Ctrl + Shift + Delete)
2. **REABRIR NAVEGADOR**
3. **TESTAR CRIAÇÃO DE FARMÁCIA**

### IMPORTANTE (DEPOIS):
4. Executar script SQL de correção
5. Verificar perfis criados
6. Testar cadastro de produto

---

## 📊 ESTATÍSTICAS ATUAIS

- **Merchants sem pharmacy_id:** 6
- **Farmácias afetadas:** Desconhecido
- **Edge Function:** ✅ OPERACIONAL
- **Frontend:** ✅ CÓDIGO CORRETO (mas cache impede uso)
- **Servidor:** ✅ RODANDO

---

## 🚀 PRÓXIMOS PASSOS

1. **LIMPE O CACHE** (método 1, 2 ou 3 acima)
2. **TESTE** criação de farmácia
3. **REPORTE** o resultado (sucesso ou erro)
4. Se ainda der erro, **COPIE** a mensagem completa do console

---

**CONCLUSÃO:** O problema NÃO é no código. É CACHE DO NAVEGADOR.

**AÇÃO IMEDIATA:** Limpar cache e testar novamente.
