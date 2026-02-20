# 🚀 Configurar Variáveis de Ambiente na Vercel

## ✅ Variáveis Necessárias

Você precisa adicionar **TODAS** as seguintes variáveis de ambiente no painel da Vercel:

### 1. Supabase (já deve ter)
```
VITE_SUPABASE_URL=https://ztxdqzqmfwgdnqpwfqwf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0eGRxenFtZndnZG5xcHdmcXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNDY3NjcsImV4cCI6MjA1MjcyMjc2N30.RcAe0CUjJVvPMdVvlQKmCJTbPDxCjTjNqZJrjQPwMJo
```

### 2. Google Maps (já deve ter)
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBSZkZXDqJQSJQJQJQJQJQJQJQJQJQJQJQ
```

### 3. Firebase Cloud Messaging ⚠️ **ADICIONAR ESTAS**
```
VITE_FIREBASE_API_KEY=AIzaSyCwEixtnqQSl_rWDn8Zocy1bvBY9_Wpu6s
VITE_FIREBASE_AUTH_DOMAIN=ifarma-89896.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ifarma-89896
VITE_FIREBASE_STORAGE_BUCKET=ifarma-89896.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=377871429826
VITE_FIREBASE_APP_ID=1:377871429826:web:32e2d2724c9bc29781cb5b
VITE_FIREBASE_VAPID_KEY=BHQ5mDF6rbQOjwk7CEBFKKyJjqBc3xo_3CMH5oo7uA6wEZVTA6OW0yc8lGa8VsIA-BI6r-J6EwcOaZkfFQ
```

---

## 📋 Passo a Passo na Vercel

### 1. Acessar Configurações
1. Vá para: https://vercel.com/dashboard
2. Selecione seu projeto **ifarma**
3. Clique em **Settings** (no menu superior)

### 2. Adicionar Variáveis
1. No menu lateral, clique em **Environment Variables**
2. Para cada variável:
   - **Name:** Cole o nome (ex: `VITE_FIREBASE_API_KEY`)
   - **Value:** Cole o valor correspondente
   - **Environments:** Selecione **Production**, **Preview** e **Development**
   - Clique em **Add**

### 3. Variáveis a Adicionar

Copie e cole uma por uma:

| Nome | Valor |
|------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyCwEixtnqQSl_rWDn8Zocy1bvBY9_Wpu6s` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `ifarma-89896.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `ifarma-89896` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `ifarma-89896.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `377871429826` |
| `VITE_FIREBASE_APP_ID` | `1:377871429826:web:32e2d2724c9bc29781cb5b` |
| `VITE_FIREBASE_VAPID_KEY` | `BHQ5mDF6rbQOjwk7CEBFKKyJjqBc3xo_3CMH5oo7uA6wEZVTA6OW0yc8lGa8VsIA-BI6r-J6EwcOaZkfFQ` |

### 4. Redeploy
Após adicionar todas as variáveis:
1. Vá para **Deployments**
2. Clique nos 3 pontinhos do último deployment
3. Clique em **Redeploy**
4. Aguarde o build finalizar

---

## ⚠️ Importante

### Vite Requer Prefixo `VITE_`
- Todas as variáveis de ambiente no Vite **DEVEM** começar com `VITE_`
- Sem esse prefixo, as variáveis não serão expostas no frontend

### Ambientes
- Marque **Production**, **Preview** e **Development** para todas
- Isso garante que funcionará em todos os ambientes

### Rebuild Necessário
- Após adicionar variáveis, você **DEVE** fazer redeploy
- As variáveis só são aplicadas em novos builds

---

## 🧪 Verificar se Funcionou

Após o redeploy:

1. Acesse seu site em produção
2. Abra o Console (F12)
3. Digite:
```javascript
console.log(import.meta.env.VITE_FIREBASE_API_KEY)
```
4. Deve mostrar: `AIzaSyCwEixtnqQSl_rWDn8Zocy1bvBY9_Wpu6s`

Se mostrar `undefined`, as variáveis não foram carregadas corretamente.

---

## 📝 Checklist

- [ ] Acessar Vercel Dashboard
- [ ] Ir em Settings → Environment Variables
- [ ] Adicionar `VITE_FIREBASE_API_KEY`
- [ ] Adicionar `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] Adicionar `VITE_FIREBASE_PROJECT_ID`
- [ ] Adicionar `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] Adicionar `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] Adicionar `VITE_FIREBASE_APP_ID`
- [ ] Adicionar `VITE_FIREBASE_VAPID_KEY`
- [ ] Marcar todos os ambientes (Production, Preview, Development)
- [ ] Fazer Redeploy
- [ ] Testar em produção

---

## 🔒 Segurança

**Essas variáveis são seguras para expor no frontend?**

✅ **SIM** - Essas são credenciais públicas do Firebase:
- `VITE_FIREBASE_API_KEY` - API Key pública
- `VITE_FIREBASE_VAPID_KEY` - VAPID Key pública
- Outras configurações públicas

❌ **NÃO EXPONHA:**
- `FIREBASE_SERVER_KEY` - Esta fica **SOMENTE** no Supabase Secrets
- Nunca adicione a Server Key no frontend ou Vercel

---

## 🎯 Resultado Esperado

Após configurar tudo:
- ✅ App em produção carrega sem erros
- ✅ Notificações funcionam em produção
- ✅ Console não mostra erros do Firebase
- ✅ Permissão de notificação é solicitada
