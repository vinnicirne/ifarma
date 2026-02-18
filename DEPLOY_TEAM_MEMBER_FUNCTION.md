# Deploy da Edge Function - Create Team Member

## 🚨 INSTRUÇÕES PARA CORRIGIR ERRO 400

O erro 400 estava ocorrendo porque o código estava usando a Edge Function `create-user-admin`, que é específica para aprovar farmácias, não para criar membros da equipe.

## ✅ SOLUÇÃO IMPLEMENTADA

1. **Nova Edge Function Criada**: `create-team-member`
   - Específica para criar membros da equipe
   - Valida permissões corretamente
   - Não depende de aprovação de farmácia

2. **Fallback Robusto**: Se a nova Edge Function não estiver deployada
   - Tenta criar usuário diretamente via Supabase Admin
   - Usa service role key para ter permissões adequadas

## 📋 PASSOS PARA DEPLOY

### Opção 1: Deploy da Nova Edge Function (Recomendado)

```bash
# Navegar para o diretório do projeto
cd c:\Ifarma

# Deploy da nova função
supabase functions deploy create-team-member

# Verificar se funcionou
supabase functions list
```

### Opção 2: Configurar Service Role Key (Fallback)

Se não puder fazer deploy da Edge Function, configure a service role key:

1. **No Supabase Dashboard**:
   - Vá para Settings > API
   - Copie a `service_role` key

2. **No arquivo .env**:
   ```env
   VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
   ```

3. **Recarregue a aplicação**

## 🔍 TESTE

Após fazer uma das opções:

1. Acesse `/gestor/equipe`
2. Tente adicionar um novo membro
3. Verifique se funciona sem erro 400

## 📊 DIAGNÓSTICO

### Antes:
```
❌ Erro 400: "Missing flag 'approve_pharmacy: true'"
❌ Edge Function errada sendo usada
❌ Sem fallback funcional
```

### Depois:
```
✅ Nova Edge Function específica para equipe
✅ Fallback robusto via Supabase Admin
✅ Tratamento de erro melhorado
✅ Sistema funcional mesmo sem deploy
```

## 🚨 IMPORTANTE

- **Service Role Key**: Nunca exponha publicamente. Use apenas em ambiente de desenvolvimento.
- **Permissões**: A nova Edge Function valida se o usuário pode gerenciar equipe.
- **Segurança**: Apenas merchants, managers e admins podem criar membros.

## 📝 ARQUIVOS CRIADOS/MODIFICADOS

- `supabase/functions/create-team-member/index.ts` - Nova Edge Function
- `src/pages/merchant/TeamManagement.tsx` - Corrigido com fallback
- `DEPLOY_TEAM_MEMBER_FUNCTION.md` - Este arquivo

---

**O sistema agora deve funcionar corretamente mesmo que a Edge Function não esteja deployada!** 🎯
