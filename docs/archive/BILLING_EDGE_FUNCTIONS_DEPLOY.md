# 🚀 Deploy das Edge Functions de Billing

## 📦 Edge Functions Criadas

1. **billing-cycle-close** - Fecha ciclos e gera faturas (CRON diário)
2. **billing-asaas-webhook** - Processa webhooks do Asaas
3. **billing-create-subscription** - Cria assinatura de plano

---

## 🔧 Passo 1: Configurar Secrets

```bash
# ASAAS_API_KEY (obrigatório)
npx supabase secrets set ASAAS_API_KEY=<sua-chave-asaas>

# ASAAS_WEBHOOK_TOKEN (opcional, mas recomendado)
npx supabase secrets set ASAAS_WEBHOOK_TOKEN=<token-secreto>
```

**Como obter:**
- ASAAS_API_KEY: https://www.asaas.com/config/api
- ASAAS_WEBHOOK_TOKEN: Gere um token aleatório (ex: `openssl rand -hex 32`)

---

## 🚀 Passo 2: Deploy das Functions

```bash
# Deploy todas de uma vez
npx supabase functions deploy billing-cycle-close
npx supabase functions deploy billing-asaas-webhook
npx supabase functions deploy billing-create-subscription

# Ou deploy todas juntas
npx supabase functions deploy
```

---

## ⏰ Passo 3: Configurar CRON (billing-cycle-close)

### Opção A: Via Supabase Dashboard (Recomendado)

1. Abrir https://supabase.com/dashboard/project/<seu-projeto>/functions
2. Clicar em `billing-cycle-close`
3. Ir em "Cron Jobs"
4. Adicionar:
   - **Schedule**: `5 0 * * *` (todo dia às 00:05)
   - **Timezone**: America/Sao_Paulo
   - **Enabled**: ✅

### Opção B: Via pg_cron (SQL)

```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar cron job
SELECT cron.schedule(
  'billing-cycle-close-daily',
  '5 0 * * *',  -- Todo dia às 00:05
  $$
  SELECT
    net.http_post(
      url := 'https://<seu-projeto>.supabase.co/functions/v1/billing-cycle-close',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <service-role-key>"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verificar cron jobs
SELECT * FROM cron.job;
```

---

## 🔗 Passo 4: Configurar Webhook no Asaas

1. Acessar https://www.asaas.com/config/webhook
2. Adicionar nova URL:
   - **URL**: `https://<seu-projeto>.supabase.co/functions/v1/billing-asaas-webhook`
   - **Eventos**:
     - ✅ PAYMENT_RECEIVED
     - ✅ PAYMENT_CONFIRMED
     - ✅ PAYMENT_OVERDUE
     - ✅ PAYMENT_DELETED
     - ✅ PAYMENT_REFUNDED
   - **Token** (opcional): Mesmo valor de `ASAAS_WEBHOOK_TOKEN`
   - **Versão**: API v3
   - **Ativo**: ✅

3. Testar webhook:
   - Clicar em "Testar"
   - Verificar logs no Supabase Dashboard

---

## 🧪 Passo 5: Testar Functions

### Teste 1: billing-create-subscription

```bash
curl -X POST \
  https://<seu-projeto>.supabase.co/functions/v1/billing-create-subscription \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacy_id": "<pharmacy-id>",
    "plan_id": "<plan-id>"
  }'
```

**Esperado:**
```json
{
  "message": "Subscription created successfully",
  "subscription": { ... },
  "cycle": { ... },
  "asaas_customer_id": "cus_...",
  "asaas_subscription_id": "sub_..."
}
```

### Teste 2: billing-cycle-close (Manual)

```bash
curl -X POST \
  https://<seu-projeto>.supabase.co/functions/v1/billing-cycle-close \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json"
```

**Esperado:**
```json
{
  "message": "Fechamento de ciclos concluído",
  "closed": 2,
  "invoices": 3
}
```

### Teste 3: billing-asaas-webhook (Simular)

```bash
curl -X POST \
  https://<seu-projeto>.supabase.co/functions/v1/billing-asaas-webhook \
  -H "asaas-access-token: <ASAAS_WEBHOOK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_...",
      "customer": "cus_...",
      "value": 99.90,
      "status": "RECEIVED",
      "dueDate": "2026-02-15",
      "paymentDate": "2026-02-14"
    }
  }'
```

**Esperado:**
```json
{
  "message": "Webhook processed successfully",
  "invoice_id": "...",
  "new_status": "paid"
}
```

---

## 📊 Passo 6: Monitorar Logs

### Via Supabase Dashboard

1. Abrir https://supabase.com/dashboard/project/<seu-projeto>/functions
2. Clicar na function
3. Ver "Logs" em tempo real

### Via CLI

```bash
# Logs da billing-cycle-close
npx supabase functions logs billing-cycle-close --tail

# Logs da billing-asaas-webhook
npx supabase functions logs billing-asaas-webhook --tail

# Logs da billing-create-subscription
npx supabase functions logs billing-create-subscription --tail
```

---

## ⚠️ Troubleshooting

### Erro: "ASAAS_API_KEY not found"

```bash
# Verificar secrets
npx supabase secrets list

# Reconfigurar
npx supabase secrets set ASAAS_API_KEY=<sua-chave>
```

### Erro: "Asaas API error: 401"

- Verificar se a chave está correta
- Verificar se está usando sandbox vs produção
- Trocar `ASAAS_BASE_URL` se necessário

### Erro: "Pharmacy already has an active subscription"

- Cancelar assinatura antiga primeiro:
  ```sql
  UPDATE pharmacy_subscriptions
  SET status = 'canceled', canceled_at = NOW()
  WHERE pharmacy_id = '<pharmacy-id>' AND status = 'active';
  ```

### Cron não está executando

```sql
-- Verificar cron jobs
SELECT * FROM cron.job;

-- Verificar execuções
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Deletar e recriar
SELECT cron.unschedule('billing-cycle-close-daily');
-- Recriar conforme Passo 3
```

---

## ✅ Checklist Final

- [ ] Secrets configurados (ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN)
- [ ] Functions deployed
- [ ] CRON configurado (billing-cycle-close)
- [ ] Webhook configurado no Asaas
- [ ] Testes executados com sucesso
- [ ] Logs monitorados

---

## 🎉 Próximos Passos

Após deploy das Edge Functions:
1. Implementar componentes frontend faltantes
2. Testar fluxo completo (criar assinatura → gerar pedidos → fechar ciclo → pagar fatura)
3. Configurar notificações (email/push) para farmácias

**Documentação:**
- `docs/BILLING_SUMMARY.md` - Resumo geral
- `docs/BILLING_TRIGGER_TEST.md` - Como testar trigger
