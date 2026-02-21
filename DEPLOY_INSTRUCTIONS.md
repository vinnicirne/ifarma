# Deploy de Edge Functions - Supabase

## 🚀 Opções de Deploy

### Opção 1: Script Automático (Recomendado)

#### Windows (Batch)
```bash
# Execute no terminal:
./DEPLOY_EDGE_FUNCTIONS.bat
```

#### Linux/Mac (Shell)
```bash
# Dê permissão e execute:
chmod +x DEPLOY_EDGE_FUNCTIONS.sh
./DEPLOY_EDGE_FUNCTIONS.sh
```

### Opção 2: Deploy Individual

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Selecionar projeto
supabase projects select gtjhpkakousmdrzjpdat

# Deploy de função específica
supabase functions deploy activate-pharmacy-plan --no-verify-jwt
supabase functions deploy create-staff-user --no-verify-jwt
supabase functions deploy create-team-member --no-verify-jwt
```

### Opção 3: Deploy de Todas as Funções

```bash
# Deploy de todas as funções de uma vez
supabase functions deploy --no-verify-jwt
```

## 📋 Funções Principais para Deploy

1. **activate-pharmacy-plan** - Corrigida com headers JWT
2. **create-staff-user** - Criação de usuários staff
3. **create-team-member** - Criação de membros da equipe
4. **billing-create-subscription** - Criação de assinaturas
5. **billing-cycle-close** - Fechamento de ciclos de billing
6. **check-asaas-payment** - Verificação de pagamentos Asaas
7. **provision-merchant-access** - Provisionamento de acesso
8. **reset-billing-cycles** - Reset de ciclos
9. **send-push-notification** - Envio de notificações push
10. **motoboy-notifier** - Notificações para motoboys
11. **order-notifier** - Notificações de pedidos
12. **asaas-webhook** - Webhook do Asaas
13. **asaas-proxy** - Proxy para Asaas

## ⚠️ Importante

- Use `--no-verify-jwt` para evitar problemas de autenticação durante o deploy
- Verifique se está no projeto correto: `gtjhpkakousmdrzjpdat`
- Após o deploy, teste as funções no dashboard

## 🔍 Verificação Pós-Deploy

1. Acesse: https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat/functions
2. Verifique se todas as funções aparecem como "Deployed"
3. Teste a criação de plano na farmácia
4. Verifique se o erro 401 desapareceu

## 🐛 Troubleshooting

### Erro: "Not logged in"
```bash
supabase login
```

### Erro: "Project not found"
```bash
supabase projects list
supabase projects select gtjhpkakousmdrzjpdat
```

### Erro: "Function not found"
Verifique se o diretório existe em `supabase/functions/`

### Erro: "Permission denied"
Verifique se tem permissão de deploy no projeto

## 📊 Links Úteis

- Dashboard: https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat
- Logs: https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat/logs
- Edge Functions: https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat/functions
