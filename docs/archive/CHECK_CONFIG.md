# 🔍 VERIFICAÇÃO DE CONFIGURAÇÃO - SUPABASE

## 📋 PASSOS PARA CORRIGIR ERROS DE CONFIGURAÇÃO

### **1. VERIFICAR VARIÁVEIS DE AMBIENTE**

Crie um arquivo `.env` na raiz do projeto com:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
VITE_SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

### **2. ONDE ENCONTRAR AS CHAVES**

1. **Acesse o Supabase Dashboard**: https://supabase.com/dashboard
2. **Selecione seu projeto**
3. **Vá para Settings > API**
4. **Copie as chaves**:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `VITE_SUPABASE_SERVICE_ROLE_KEY`

### **3. VERIFICAR CONEXÃO**

Execute este comando no terminal para testar:

```bash
# Verificar se as variáveis estão configuradas
cd c:\Ifarma
echo "VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."
```

### **4. TESTAR CONEXÃO COM SUPABASE**

Crie um arquivo `test-connection.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('❌ Variáveis de ambiente não configuradas');
    console.error('VITE_SUPABASE_URL:', !!url);
    console.error('VITE_SUPABASE_ANON_KEY:', !!key);
} else {
    console.log('✅ Configuração encontrada');
    
    const supabase = createClient(url, key);
    
    // Testar conexão
    supabase.from('profiles').select('count').then(result => {
        if (result.error) {
            console.error('❌ Erro de conexão:', result.error);
        } else {
            console.log('✅ Conexão bem-sucedida!');
        }
    });
}
```

### **5. PROBLEMAS COMUNS E SOLUÇÕES**

#### **Erro: "Variáveis de ambiente não configuradas"**
- ✅ **Solução**: Criar arquivo `.env` com as chaves corretas

#### **Erro: "fetch failed" / "network error"**
- ✅ **Solução**: Verificar internet e URL do Supabase
- ✅ **Solução**: Verificar se o projeto Supabase está ativo

#### **Erro: "Invalid API key"**
- ✅ **Solução**: Verificar se a chave está correta
- ✅ **Solução**: Usar a chave `anon public`, não a `service_role`

#### **Erro: "permission denied"**
- ✅ **Solução**: Executar SQL `FIX_RLS_SIMPLES.sql`
- ✅ **Solução**: Verificar RLS policies

#### **Erro: "column does not exist"**
- ✅ **Solução**: Executar SQL para adicionar campos faltantes
- ✅ **Solução**: Rodar `AUDITORIA_EQUIPE_DIAGNOSTICO.sql`

### **6. SQL NECESSÁRIO (SE PRECISO)**

Execute no Supabase Dashboard > SQL Editor:

```sql
-- Adicionar campos faltantes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id),
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT;

-- Atualizar RLS policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar policies básicas
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);
```

### **7. TESTE FINAL**

Após configurar:

1. **Reinicie o servidor**:
   ```bash
   npm run dev
   ```

2. **Acesse**:
   ```
   http://localhost:5174/gestor/equipe
   ```

3. **Verifique o console**:
   ```
   ✅ Supabase configurado: https://...
   ✅ Usuário autenticado: [id]
   ✅ Perfil obtido: {pharmacy_id, role}
   ```

---

## 🚨 CHECKLIST RÁPIDO

- [ ] Arquivo `.env` criado
- [ ] `VITE_SUPABASE_URL` configurada
- [ ] `VITE_SUPABASE_ANON_KEY` configurada
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` configurada
- [ ] Servidor reiniciado
- [ ] Console sem erros de configuração
- [ ] Página carrega sem erros

---

## 📞 SUPORTE

Se ainda houver erros:

1. **Verifique o console do navegador** (F12)
2. **Verifique o console do servidor** (terminal)
3. **Confirme as chaves no Supabase Dashboard**
4. **Teste a conexão manualmente**

**O sistema agora tem tratamento robusto para todos os erros de configuração!** 🎯
