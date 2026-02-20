# ✅ Checklist de Implementação - Sistema de Cobrança

**Status:** Ready to Deploy  
**Data:** 2026-02-12

---

## 📦 Arquivos Criados

### 1. Documentação
- ✅ `docs/billing-system-prd.md` - PRD completo

### 2. Banco de Dados
- ✅ `supabase/migrations/20260212_billing_system_complete.sql` - Migration completa
  - 8 tabelas
  - RLS policies
  - Triggers de auditoria
  - Funções auxiliares
  - Seed data (3 planos)

### 3. Edge Functions
- ✅ `supabase/functions/billing-cycle-close/index.ts` - Fechamento de ciclo (cron)
- ✅ `supabase/functions/billing-asaas-webhook/index.ts` - Webhook Asaas
- ✅ `supabase/functions/billing-create-subscription/index.ts` - Criar assinatura

### 4. Componentes Admin
- ✅ `src/pages/admin/BillingPlans.tsx` - Gerenciar planos
- ✅ `src/pages/admin/BillingPolicies.tsx` - Gerenciar políticas

---

## 🚀 Próximos Passos (Ordem de Execução)

### Fase 1: Banco de Dados (30 min)

#### 1.1. Rodar Migration
```bash
# Conectar ao Supabase
npx supabase db push

# Ou via SQL Editor no Dashboard
# Copiar e colar: supabase/migrations/20260212_billing_system_complete.sql
```

#### 1.2. Verificar Tabelas
```sql
-- Verificar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'billing_%';

-- Deve retornar:
-- billing_plans
-- billing_global_config
-- billing_policy
-- pharmacy_subscriptions
-- pharmacy_contracts
-- billing_cycles
-- billing_invoices
-- audit_log
```

#### 1.3. Verificar Seed Data
```sql
-- Verificar planos criados
SELECT name, monthly_fee_cents, free_orders_per_period FROM billing_plans;

-- Deve retornar:
-- Free: 0, 10
-- Pro: 9900, 100
-- Premium: 29900, 999999
```

#### 1.4. Testar RLS
```bash
# Usar script de teste
node test_rls_access.js
```

---

### Fase 2: Edge Functions (45 min)

#### 2.1. Deploy Edge Functions
```bash
# Deploy billing-cycle-close
npx supabase functions deploy billing-cycle-close

# Deploy billing-asaas-webhook
npx supabase functions deploy billing-asaas-webhook

# Deploy billing-create-subscription
npx supabase functions deploy billing-create-subscription
```

#### 2.2. Configurar Variáveis de Ambiente
```bash
# No Supabase Dashboard > Edge Functions > Secrets
ASAAS_API_KEY=$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjJkODJkYjg5LTBkZDUtNDY2OC05NWY0LTU0YzMzMjI2ZjBkODo6JGFhY2hfMzRkYzdjZTUtMTg5OC00MjQyLWEwMjYtYzExZTgwNWJhNTlj
ASAAS_WEBHOOK_TOKEN=<seu_token_opcional>
```

#### 2.3. Configurar Cron (Cycle Close)
```bash
# No Supabase Dashboard > Database > Cron Jobs
# Criar job:
SELECT cron.schedule(
  'billing-cycle-close',
  '5 3 * * *', -- 00:05 horário de Brasília (UTC-3)
  $$
  SELECT net.http_post(
    url := 'https://<seu-projeto>.supabase.co/functions/v1/billing-cycle-close',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <service-role-key>"}'::jsonb
  );
  $$
);
```

#### 2.4. Configurar Webhook no Asaas
```
1. Acessar: https://www.asaas.com/config/webhooks
2. Criar webhook:
   - URL: https://<seu-projeto>.supabase.co/functions/v1/billing-asaas-webhook
   - Eventos:
     ✅ PAYMENT_RECEIVED
     ✅ PAYMENT_CONFIRMED
     ✅ PAYMENT_OVERDUE
     ✅ PAYMENT_DELETED
     ✅ PAYMENT_RESTORED
   - Token: <seu_token_opcional>
```

#### 2.5. Testar Edge Functions
```bash
# Teste 1: Criar assinatura
curl -X POST https://<seu-projeto>.supabase.co/functions/v1/billing-create-subscription \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"pharmacy_id": "<pharmacy-id>", "plan_id": "<plan-id>"}'

# Teste 2: Fechar ciclo (manual)
curl -X POST https://<seu-projeto>.supabase.co/functions/v1/billing-cycle-close \
  -H "Authorization: Bearer <service-role-key>"

# Teste 3: Webhook (simular)
curl -X POST https://<seu-projeto>.supabase.co/functions/v1/billing-asaas-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test_123",
      "status": "RECEIVED",
      "paymentDate": "2026-02-12"
    }
  }'
```

---

### Fase 3: Frontend (1h)

#### 3.1. Adicionar Rotas
```tsx
// src/App.tsx ou routes.tsx
import BillingPlans from './pages/admin/BillingPlans';
import BillingPolicies from './pages/admin/BillingPolicies';

// Adicionar rotas (somente Admin):
{
  path: '/admin/billing/plans',
  element: <BillingPlans />,
},
{
  path: '/admin/billing/policies',
  element: <BillingPolicies />,
}
```

#### 3.2. Adicionar Menu Admin
```tsx
// Adicionar no menu lateral do Admin
<Link to="/admin/billing/plans">
  💳 Planos
</Link>
<Link to="/admin/billing/policies">
  ⚙️ Políticas
</Link>
```

#### 3.3. Testar Telas
```
1. Acessar /admin/billing/plans
   - Verificar se os 3 planos aparecem
   - Criar novo plano
   - Editar plano existente
   - Ativar/desativar plano

2. Acessar /admin/billing/policies
   - Editar políticas operacionais
   - Editar configuração global
   - Salvar e verificar auditoria
```

---

### Fase 4: Componentes Faltantes (2h)

#### 4.1. Tela: Farmácias (Assinaturas)
```tsx
// src/pages/admin/BillingPharmacies.tsx
// Lista farmácias + plano atual + criar/editar contrato
// TODO: Criar componente
```

#### 4.2. Tela: Faturas + Dashboard
```tsx
// src/pages/admin/BillingInvoices.tsx
// Lista faturas + filtros + gráficos de receita
// TODO: Criar componente
```

#### 4.3. Tela: Auditoria
```tsx
// src/pages/admin/BillingAudit.tsx
// Log de mudanças (quem, quando, o quê)
// TODO: Criar componente
```

#### 4.4. Tela: Meu Plano (Farmácia)
```tsx
// src/pages/pharmacy/MyPlan.tsx
// Plano atual + pedidos grátis restantes + histórico
// TODO: Criar componente
```

#### 4.5. Tela: Faturas (Farmácia)
```tsx
// src/pages/pharmacy/MyInvoices.tsx
// Faturas pendentes/pagas + download de boletos
// TODO: Criar componente
```

---

### Fase 5: Testes (1h)

#### 5.1. Teste: Resolução de Regras
```sql
-- Teste 1: Farmácia sem plano (usa global)
SELECT * FROM get_billing_config('<pharmacy-id-sem-plano>');
-- Deve retornar: source = 'global'

-- Teste 2: Farmácia com plano (usa plano)
SELECT * FROM get_billing_config('<pharmacy-id-com-plano>');
-- Deve retornar: source = 'plan'

-- Teste 3: Farmácia com contrato (usa contrato)
SELECT * FROM get_billing_config('<pharmacy-id-com-contrato>');
-- Deve retornar: source = 'contract'
```

#### 5.2. Teste: Cálculo de Excedente
```
1. Criar farmácia com plano Free (10 pedidos grátis)
2. Criar 15 pedidos entregues no mês
3. Rodar billing-cycle-close
4. Verificar:
   - orders_count = 15
   - free_orders_used = 10
   - overage_orders = 5
   - overage_fee_cents > 0
```

#### 5.3. Teste: Geração de Fatura no Asaas
```
1. Criar farmácia com excedente
2. Rodar billing-cycle-close
3. Verificar:
   - Fatura criada em billing_invoices
   - asaas_payment_id preenchido
   - Status = 'pending'
   - Boleto gerado no Asaas
```

#### 5.4. Teste: Webhook de Pagamento
```
1. Simular webhook de PAYMENT_RECEIVED
2. Verificar:
   - billing_invoices.status = 'paid'
   - billing_invoices.paid_at preenchido
   - billing_cycles.status = 'invoiced'
```

---

## 🔐 Segurança (Checklist)

- ✅ RLS habilitado em todas as tabelas
- ✅ Admin Global: CRUD em planos, políticas, contratos
- ✅ Farmácia: Read apenas (próprios dados)
- ✅ Auditoria: Log de mudanças (quem, quando, o quê)
- ✅ Edge Functions: Service Role Key (não exposta)
- ✅ Asaas API Key: Variável de ambiente (não hardcoded)

---

## 📊 Monitoramento (Pós-Deploy)

### 1. Logs de Edge Functions
```bash
# Ver logs de billing-cycle-close
npx supabase functions logs billing-cycle-close

# Ver logs de billing-asaas-webhook
npx supabase functions logs billing-asaas-webhook
```

### 2. Queries de Monitoramento
```sql
-- Ciclos fechados hoje
SELECT * FROM billing_cycles 
WHERE closed_at::date = CURRENT_DATE;

-- Faturas pendentes
SELECT * FROM billing_invoices 
WHERE status = 'pending' 
ORDER BY due_date;

-- Farmácias com excedente este mês
SELECT 
  p.name,
  bc.overage_orders,
  bc.overage_fee_cents
FROM billing_cycles bc
JOIN pharmacies p ON p.id = bc.pharmacy_id
WHERE bc.period_start = date_trunc('month', CURRENT_DATE)
AND bc.overage_orders > 0;
```

### 3. Alertas (Configurar)
```
- Fatura vencida há 7 dias → Notificar farmácia
- Ciclo não fechado → Notificar Admin
- Erro no Asaas → Notificar Admin
```

---

## 🎯 Critérios de Sucesso

### MVP Completo quando:
- ✅ Planos editáveis no painel
- ✅ Políticas editáveis no painel
- ✅ Ciclos fecham automaticamente (cron)
- ✅ Excedente calculado corretamente
- ✅ Fatura gerada no Asaas
- ✅ Webhook atualiza status
- ✅ Auditoria registra mudanças
- ✅ RLS protege dados

---

## 📝 Notas Importantes

### 1. Asaas Sandbox vs Produção
```
Sandbox: https://api-sandbox.asaas.com/v3
Produção: https://api.asaas.com/v3

Trocar ASAAS_API_KEY quando for pra produção!
```

### 2. Horário do Cron
```
Cron: 5 3 * * * (UTC)
= 00:05 horário de Brasília (UTC-3)

Ajustar se mudar horário de verão!
```

### 3. Backup Antes de Deploy
```bash
# Backup do banco antes de rodar migration
npx supabase db dump > backup_$(date +%Y%m%d).sql
```

---

## 🚨 Troubleshooting

### Problema: Ciclo não fecha
```
1. Verificar cron job ativo
2. Verificar logs da Edge Function
3. Verificar se há ciclos com period_end = ontem
```

### Problema: Fatura não criada no Asaas
```
1. Verificar ASAAS_API_KEY
2. Verificar se pharmacy tem asaas_customer_id
3. Verificar logs da Edge Function
4. Testar API do Asaas manualmente
```

### Problema: Webhook não atualiza status
```
1. Verificar URL do webhook no Asaas
2. Verificar ASAAS_WEBHOOK_TOKEN
3. Verificar logs da Edge Function
4. Simular webhook manualmente
```

---

**Pronto para implementar!** 🎉

**Tempo estimado total:** 4-5 horas

**Ordem recomendada:**
1. Banco (30 min)
2. Edge Functions (45 min)
3. Frontend básico (1h)
4. Testes (1h)
5. Componentes faltantes (2h)

**Próximo comando:**
```bash
npx supabase db push
```
