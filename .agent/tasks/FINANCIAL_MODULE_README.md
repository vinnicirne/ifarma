# 💰 Módulo Financeiro - Guia de Implementação

## 📋 Visão Geral

Este módulo implementa um sistema completo de cobrança com:
- **Planos configuráveis** (Free, Professional, Premium)
- **Mensalidade recorrente** via Asaas
- **Cobrança por uso** (pedidos excedentes)
- **Contratos personalizados** (overrides por farmácia)
- **Painel Admin** para gestão completa
- **Painel Farmácia** para acompanhamento

---

## 🚀 Passo a Passo de Implementação

### 1️⃣ Aplicar Schema SQL

Execute a migration no Supabase:

```bash
# Via Supabase CLI
supabase db push

# Ou via SQL Editor no Dashboard Supabase
# Cole o conteúdo de: supabase/migrations/20260212_financial_module_schema.sql
```

**Verificação**:
```sql
-- Verificar se tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'billing_%';

-- Deve retornar:
-- billing_plans
-- billing_global_config
-- billing_policy
-- billing_cycles
-- billing_invoices
-- billing_audit_log
```

---

### 2️⃣ Configurar Variáveis de Ambiente (Asaas)

No Supabase Dashboard → Settings → Secrets, adicione:

```env
ASAAS_API_KEY=seu_api_key_aqui
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3  # Sandbox para testes
ASAAS_WEBHOOK_TOKEN=seu_token_secreto_aqui
```

**Para produção**, altere para:
```env
ASAAS_BASE_URL=https://api.asaas.com/v3
```

---

### 3️⃣ Deploy das Edge Functions

```bash
# Deploy de todas as funções
supabase functions deploy close-billing-cycles
supabase functions deploy reset-billing-cycles
supabase functions deploy asaas-webhook
supabase functions deploy activate-pharmacy-plan

# Verificar deploy
supabase functions list
```

---

### 4️⃣ Configurar Cron Jobs (Supabase)

No Supabase Dashboard → Database → Cron Jobs:

#### Reset de Ciclos (Dia 1º do mês - 00:05 UTC)
```sql
SELECT cron.schedule(
  'reset-billing-cycles',
  '5 0 * * *',  -- Todo dia às 00:05 UTC
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/reset-billing-cycles',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

#### Fechamento de Ciclos (Dia 1º do mês - 01:00 UTC)
```sql
SELECT cron.schedule(
  'close-billing-cycles',
  '0 1 * * *',  -- Todo dia às 01:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/close-billing-cycles',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

**Substituir**: `SEU_PROJECT_ID` pelo ID real do projeto.

---

### 5️⃣ Configurar Webhook do Asaas

No painel do Asaas → Configurações → Webhooks:

**URL do Webhook**:
```
https://SEU_PROJECT_ID.supabase.co/functions/v1/asaas-webhook
```

**Token de Autenticação** (Header):
```
asaas-access-token: SEU_WEBHOOK_TOKEN
```

**Eventos para escutar**:
- ✅ `PAYMENT_RECEIVED`
- ✅ `PAYMENT_OVERDUE`
- ✅ `PAYMENT_CONFIRMED`
- ✅ `PAYMENT_DELETED`
- ✅ `PAYMENT_REFUNDED`

---

### 6️⃣ Adicionar Campo `asaas_customer_id` na Tabela `pharmacies`

```sql
ALTER TABLE pharmacies 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pharmacies_asaas_customer 
ON pharmacies(asaas_customer_id);
```

---

### 7️⃣ Testar Integração (Sandbox)

#### Teste 1: Ativar Plano de Farmácia

```bash
curl -X POST \
  https://SEU_PROJECT_ID.supabase.co/functions/v1/activate-pharmacy-plan \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacy_id": "uuid-da-farmacia",
    "plan_id": "uuid-do-plano-professional"
  }'
```

**Verificar**:
```sql
-- Deve ter criado assinatura
SELECT * FROM pharmacy_subscriptions WHERE pharmacy_id = 'uuid-da-farmacia';

-- Deve ter criado ciclo
SELECT * FROM billing_cycles WHERE pharmacy_id = 'uuid-da-farmacia';

-- Deve ter criado cliente no Asaas
SELECT asaas_customer_id FROM pharmacies WHERE id = 'uuid-da-farmacia';
```

#### Teste 2: Simular Pedido Entregue

```sql
-- Inserir pedido de teste
INSERT INTO orders (pharmacy_id, status, total_amount)
VALUES ('uuid-da-farmacia', 'delivered', 5000);  -- R$ 50,00

-- Verificar se contador foi incrementado
SELECT free_orders_used, overage_orders 
FROM billing_cycles 
WHERE pharmacy_id = 'uuid-da-farmacia' AND status = 'active';
```

#### Teste 3: Forçar Fechamento de Ciclo

```bash
curl -X POST \
  https://SEU_PROJECT_ID.supabase.co/functions/v1/close-billing-cycles \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY"
```

**Verificar**:
```sql
-- Ciclo deve estar fechado
SELECT status FROM billing_cycles WHERE pharmacy_id = 'uuid-da-farmacia';

-- Se houver excedente, deve ter criado fatura
SELECT * FROM billing_invoices WHERE pharmacy_id = 'uuid-da-farmacia';
```

---

## 🎨 Implementação do Front-End

### Estrutura de Pastas

```
src/
├── pages/
│   ├── admin/
│   │   ├── BillingPlans.tsx          # Gestão de planos
│   │   ├── BillingPolicies.tsx       # Políticas operacionais
│   │   ├── PharmacySubscriptions.tsx # Assinaturas
│   │   ├── PharmacyContracts.tsx     # Contratos personalizados
│   │   └── BillingRevenue.tsx        # Receita e faturas
│   └── pharmacy/
│       ├── MyPlan.tsx                # Meu plano
│       ├── BillingUsage.tsx          # Uso no mês
│       └── BillingInvoices.tsx       # Faturas
├── components/
│   ├── billing/
│   │   ├── PlanCard.tsx              # Card de plano
│   │   ├── UsageProgressBar.tsx      # Barra de progresso
│   │   ├── InvoiceList.tsx           # Lista de faturas
│   │   └── PlanSelector.tsx          # Seletor de plano
└── hooks/
    ├── useBillingPlans.ts            # Hook para planos
    ├── usePharmacyBilling.ts         # Hook para status da farmácia
    └── useBillingInvoices.ts         # Hook para faturas
```

### Exemplo: Hook `usePharmacyBilling`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PharmacyBillingStatus } from '@/types/billing';

export function usePharmacyBilling(pharmacyId: string) {
  const [status, setStatus] = useState<PharmacyBillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBillingStatus() {
      try {
        // Buscar assinatura + plano
        const { data: subscription } = await supabase
          .from('pharmacy_subscriptions')
          .select('*, plan:billing_plans(*)')
          .eq('pharmacy_id', pharmacyId)
          .eq('status', 'active')
          .single();

        // Buscar ciclo ativo
        const { data: cycle } = await supabase
          .from('billing_cycles')
          .select('*')
          .eq('pharmacy_id', pharmacyId)
          .eq('status', 'active')
          .single();

        // Buscar regras (função SQL)
        const { data: rules } = await supabase
          .rpc('get_pharmacy_billing_rules', { p_pharmacy_id: pharmacyId })
          .single();

        // Calcular uso
        const usage = {
          free_orders_used: cycle?.free_orders_used || 0,
          free_orders_limit: rules?.free_orders_per_period || 0,
          overage_orders: cycle?.overage_orders || 0,
          overage_amount_cents: cycle?.overage_amount_cents || 0,
          percentage_used: ((cycle?.free_orders_used || 0) / (rules?.free_orders_per_period || 1)) * 100,
          is_near_limit: ((cycle?.free_orders_used || 0) / (rules?.free_orders_per_period || 1)) >= 0.8,
          is_over_limit: (cycle?.free_orders_used || 0) >= (rules?.free_orders_per_period || 0),
        };

        // Buscar faturas pendentes/vencidas
        const { data: invoices } = await supabase
          .from('billing_invoices')
          .select('*')
          .eq('pharmacy_id', pharmacyId)
          .in('status', ['pending', 'overdue']);

        const pending = invoices?.filter(i => i.status === 'pending') || [];
        const overdue = invoices?.filter(i => i.status === 'overdue') || [];

        setStatus({
          subscription,
          current_cycle: cycle,
          rules,
          usage,
          invoices: {
            pending,
            overdue,
            total_pending_cents: pending.reduce((sum, i) => sum + i.amount_cents, 0),
            total_overdue_cents: overdue.reduce((sum, i) => sum + i.amount_cents, 0),
          },
        });
      } catch (error) {
        console.error('Erro ao buscar status de cobrança:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBillingStatus();
  }, [pharmacyId]);

  return { status, loading };
}
```

---

## 🔒 Segurança e Auditoria

### RLS Habilitado
Todas as tabelas possuem RLS ativado:
- ✅ Admin: acesso total
- ✅ Farmácia: acesso apenas aos próprios dados
- ✅ Auditoria: log de todas as mudanças

### Validações Importantes

1. **Antes de criar contrato**: verificar se farmácia existe
2. **Antes de ativar plano**: verificar se não há assinatura ativa
3. **Antes de gerar fatura**: verificar se há excedente real
4. **Webhook do Asaas**: validar token de autenticação

---

## 📊 Monitoramento

### Logs Importantes

```sql
-- Faturas vencidas
SELECT p.name, i.amount_cents, i.due_date, i.asaas_invoice_url
FROM billing_invoices i
JOIN pharmacies p ON p.id = i.pharmacy_id
WHERE i.status = 'overdue'
ORDER BY i.due_date;

-- Farmácias inadimplentes
SELECT p.name, s.status, s.next_billing_date
FROM pharmacy_subscriptions s
JOIN pharmacies p ON p.id = s.pharmacy_id
WHERE s.status = 'overdue';

-- Receita do mês (MRR)
SELECT SUM(monthly_fee_cents) / 100 AS mrr
FROM billing_plans bp
JOIN pharmacy_subscriptions ps ON ps.plan_id = bp.id
WHERE ps.status = 'active';

-- Receita por uso (mês atual)
SELECT SUM(overage_amount_cents) / 100 AS overage_revenue
FROM billing_cycles
WHERE period_start >= DATE_TRUNC('month', CURRENT_DATE)
  AND status IN ('active', 'closed', 'invoiced');
```

---

## 🐛 Troubleshooting

### Problema: Ciclo não foi criado automaticamente

**Solução**:
```sql
-- Verificar se cron está rodando
SELECT * FROM cron.job WHERE jobname = 'reset-billing-cycles';

-- Executar manualmente
SELECT net.http_post(
  url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/reset-billing-cycles',
  headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
);
```

### Problema: Fatura não foi criada no Asaas

**Solução**:
```sql
-- Verificar logs da Edge Function
-- No Supabase Dashboard → Edge Functions → close-billing-cycles → Logs

-- Reprocessar ciclo manualmente
UPDATE billing_cycles SET status = 'active' WHERE id = 'uuid-do-ciclo';
-- Depois executar close-billing-cycles novamente
```

### Problema: Webhook não está atualizando status

**Solução**:
1. Verificar se URL do webhook está correta no Asaas
2. Verificar se token de autenticação está correto
3. Testar webhook manualmente:

```bash
curl -X POST \
  https://SEU_PROJECT_ID.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: SEU_WEBHOOK_TOKEN" \
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

## 📚 Próximos Passos

### MVP Completo
- [ ] Aplicar schema SQL
- [ ] Deploy de Edge Functions
- [ ] Configurar cron jobs
- [ ] Configurar webhook Asaas
- [ ] Implementar telas Admin
- [ ] Implementar telas Farmácia
- [ ] Testes em sandbox

### Melhorias Futuras (Pós-MVP)
- [ ] Downgrade automático de plano
- [ ] Upgrade de plano no meio do mês (cálculo proporcional)
- [ ] Multa e juros automáticos
- [ ] Relatório de receita (gráficos)
- [ ] Exportação de faturas (PDF)
- [ ] Notificações por email (vencimento, inadimplência)
- [ ] Dashboard de métricas (Churn, LTV, CAC)

---

## 🆘 Suporte

Em caso de dúvidas ou problemas:
1. Verificar logs das Edge Functions
2. Verificar auditoria (`billing_audit_log`)
3. Consultar documentação do Asaas: https://docs.asaas.com/

---

**Desenvolvido com ❤️ para o ifarma**
