# 🚨 AÇÃO IMEDIATA NECESSÁRIA

## ✅ O QUE JÁ FOI FEITO

1. ✅ Edge Function corrigida e deployada
2. ✅ Frontend corrigido (PharmacyDetails.tsx)
3. ✅ Servidor reiniciado com as correções

---

## 🎯 PRÓXIMOS PASSOS (FAÇA AGORA)

### PASSO 1: Recarregar a Página ⚠️ IMPORTANTE

**A página precisa ser recarregada para carregar o código JavaScript atualizado!**

1. Na página `http://localhost:5173/dashboard/pharmacy/new`
2. Pressione **Ctrl + Shift + R** (ou **Ctrl + F5**) para forçar recarga
3. Aguarde a página carregar completamente

### PASSO 2: Criar Farmácia Novamente

Preencha o formulário com os mesmos dados:

**Dados do Estabelecimento:**
- Nome Fantasia: `Farmácia Teste Final`
- CNPJ: `12.345.678/0001-99`
- Telefone da Loja: `(11) 3456-7890`
- Plano: `Gratuito`

**Credenciais de Acesso (Gestor):**
- Email: `teste.final@ifarma.com`
- Senha: `Teste123!@#`

**Endereço:**
- CEP: `01310-100`
- Número: `1578`

### PASSO 3: Clicar em SALVAR

**RESULTADO ESPERADO:**
- ✅ Mensagem: "Farmácia salva com sucesso!"
- ✅ Redirecionamento para lista de farmácias
- ✅ **SEM** erro "non-2xx status code"

---

## 🔍 SE AINDA DER ERRO

### Verificar Console do Navegador (F12)

Procure por:
1. Erro de rede (Network)
2. Mensagem de erro da Edge Function
3. Detalhes do erro HTTP

### Copiar e Enviar

Se ainda houver erro, copie:
1. A mensagem de erro completa do console
2. A resposta da Edge Function (aba Network → create-user-admin → Response)

---

## 📊 VERIFICAÇÃO APÓS SUCESSO

Execute no Supabase SQL Editor:

```sql
-- Verificar farmácia
SELECT id, name, owner_email, status
FROM pharmacies
WHERE owner_email = 'teste.final@ifarma.com';

-- Verificar perfil
SELECT p.id, p.email, p.pharmacy_id, ph.name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.email = 'teste.final@ifarma.com';
```

**Resultado Esperado:**
- Farmácia criada com status 'approved'
- Perfil criado com pharmacy_id vinculado

---

## 🎯 MUDANÇAS APLICADAS

### No Frontend (PharmacyDetails.tsx):
```typescript
// ANTES (❌ Sem auth_token)
const { data: authData, error: authErr } = await supabase.functions.invoke('create-user-admin', {
    body: {
        email: formData.merchant_email,
        password: formData.merchant_password,
        metadata: { ... }
    }
});

// DEPOIS (✅ Com auth_token e pharmacy_id)
const { data: { session: currentSession } } = await supabase.auth.getSession();

const { data: authData, error: authErr } = await supabase.functions.invoke('create-user-admin', {
    body: {
        email: formData.merchant_email,
        password: formData.merchant_password,
        auth_token: currentSession.access_token, // 🔥 ADICIONADO
        pharmacy_id: pharmacyId, // 🔥 ADICIONADO
        metadata: { ... }
    }
});
```

---

**AGORA RECARREGUE A PÁGINA E TENTE NOVAMENTE!** 🚀
