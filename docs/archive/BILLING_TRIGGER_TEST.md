# 🧪 TESTE DO TRIGGER AUTOMÁTICO DE BILLING

## 🎯 Objetivo

Verificar se o trigger `increment_billing_cycle_on_order_delivered()` está funcionando corretamente.

---

## 📋 Pré-requisitos

1. ✅ Migrations aplicadas manualmente
2. ✅ Migrations marcadas como aplicadas (`migration repair`)
3. ✅ Seed data carregado (3 planos, 4 políticas, 1 config global)

---

## 🧪 Teste Passo a Passo

### 1. Preparar Dados de Teste

Execute no **Supabase Dashboard > SQL Editor**:

```sql
-- 1.1. Buscar uma farmácia existente
SELECT id, name FROM pharmacies LIMIT 5;

-- Copie um pharmacy_id para usar nos próximos passos
-- Exemplo: '123e4567-e89b-12d3-a456-426614174000'
```

### 1.2. Criar Assinatura para a Farmácia

```sql
-- Substituir <pharmacy_id> e <plan_id>
INSERT INTO pharmacy_subscriptions (
    pharmacy_id, 
    plan_id, 
    status, 
    started_at, 
    next_billing_date
)
VALUES (
    '<pharmacy_id>',  -- ID da farmácia
    (SELECT id FROM billing_plans WHERE slug = 'free'),  -- Plano Free
    'active',
    NOW(),
    DATE_TRUNC('month', NOW() + INTERVAL '1 month')
)
ON CONFLICT DO NOTHING;

-- Verificar
SELECT ps.id, p.name AS pharmacy_name, bp.name AS plan_name, ps.status
FROM pharmacy_subscriptions ps
JOIN pharmacies p ON p.id = ps.pharmacy_id
JOIN billing_plans bp ON bp.id = ps.plan_id
WHERE ps.pharmacy_id = '<pharmacy_id>';
```

### 1.3. Criar Ciclo de Cobrança Ativo

```sql
-- Substituir <pharmacy_id>
INSERT INTO billing_cycles (
    pharmacy_id,
    period_start,
    period_end,
    status,
    free_orders_used,
    overage_orders,
    overage_amount_cents
)
VALUES (
    '<pharmacy_id>',
    DATE_TRUNC('month', NOW()),  -- Primeiro dia do mês
    (DATE_TRUNC('month', NOW() + INTERVAL '1 month') - INTERVAL '1 day')::DATE,  -- Último dia do mês
    'active',
    0,  -- Nenhum pedido usado ainda
    0,  -- Nenhum excedente
    0   -- R$ 0,00 de excedente
)
ON CONFLICT DO NOTHING;

-- Verificar
SELECT 
    bc.id,
    p.name AS pharmacy_name,
    bc.period_start,
    bc.period_end,
    bc.free_orders_used,
    bc.overage_orders,
    bc.overage_amount_cents / 100.0 AS overage_amount_reais,
    bc.status
FROM billing_cycles bc
JOIN pharmacies p ON p.id = bc.pharmacy_id
WHERE bc.pharmacy_id = '<pharmacy_id>' AND bc.status = 'active';
```

---

## 🚀 Teste do Trigger

### 2.1. Criar Pedido de Teste

```sql
-- Substituir <pharmacy_id> e <customer_id>
INSERT INTO orders (
    pharmacy_id,
    customer_id,
    status,
    total_price,
    delivery_fee,
    payment_method,
    payment_status
)
VALUES (
    '<pharmacy_id>',
    '<customer_id>',  -- Qualquer customer_id válido
    'pending',
    5000,  -- R$ 50,00
    500,   -- R$ 5,00
    'pix',
    'pending'
)
RETURNING id, status, total_price;

-- Copie o order_id retornado
```

### 2.2. Verificar Estado Antes

```sql
-- Substituir <pharmacy_id>
SELECT 
    free_orders_used,
    overage_orders,
    overage_amount_cents / 100.0 AS overage_amount_reais
FROM billing_cycles
WHERE pharmacy_id = '<pharmacy_id>' AND status = 'active';

-- Deve mostrar: free_orders_used = 0, overage_orders = 0
```

### 2.3. Marcar Pedido como Entregue (TRIGGER DISPARA AQUI!)

```sql
-- Substituir <order_id>
UPDATE orders 
SET status = 'delivered' 
WHERE id = '<order_id>';
```

### 2.4. Verificar Estado Depois

```sql
-- Substituir <pharmacy_id>
SELECT 
    free_orders_used,
    overage_orders,
    overage_amount_cents / 100.0 AS overage_amount_reais
FROM billing_cycles
WHERE pharmacy_id = '<pharmacy_id>' AND status = 'active';

-- ✅ ESPERADO: free_orders_used = 1, overage_orders = 0
-- (Plano Free tem 50 pedidos grátis, então o primeiro pedido é grátis)
```

---

## ✅ Resultado Esperado

### Cenário 1: Pedido Dentro do Limite Grátis

```
ANTES:
free_orders_used = 0
overage_orders = 0
overage_amount_cents = 0

DEPOIS (após marcar como delivered):
free_orders_used = 1  ✅
overage_orders = 0
overage_amount_cents = 0
```

### Cenário 2: Pedido Excedente (após 50 pedidos)

Para testar excedente, você precisa:

1. Atualizar o ciclo para simular 50 pedidos já usados:

```sql
UPDATE billing_cycles
SET free_orders_used = 50
WHERE pharmacy_id = '<pharmacy_id>' AND status = 'active';
```

2. Criar novo pedido e marcar como delivered:

```sql
-- Criar pedido
INSERT INTO orders (pharmacy_id, customer_id, status, total_price)
VALUES ('<pharmacy_id>', '<customer_id>', 'pending', 5000)
RETURNING id;

-- Marcar como delivered
UPDATE orders SET status = 'delivered' WHERE id = '<order_id>';
```

3. Verificar:

```sql
SELECT 
    free_orders_used,
    overage_orders,
    overage_amount_cents / 100.0 AS overage_amount_reais
FROM billing_cycles
WHERE pharmacy_id = '<pharmacy_id>' AND status = 'active';

-- ✅ ESPERADO:
-- free_orders_used = 50 (não muda)
-- overage_orders = 1  ✅
-- overage_amount_cents = 0 (Plano Free não cobra excedente, mas BLOQUEIA)
```

---

## 🔍 Troubleshooting

### Problema: Contador não incrementou

**Possíveis causas:**

1. **Trigger não existe**
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_increment_billing_cycle';
   -- Se vazio, o trigger não foi criado
   ```

2. **Função não existe**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'increment_billing_cycle_on_order_delivered';
   -- Se vazio, a função não foi criada
   ```

3. **Ciclo não está ativo**
   ```sql
   SELECT status FROM billing_cycles WHERE pharmacy_id = '<pharmacy_id>';
   -- Deve ser 'active'
   ```

4. **Status não mudou para 'delivered'**
   ```sql
   SELECT status FROM orders WHERE id = '<order_id>';
   -- Deve ser 'delivered'
   ```

### Solução: Reaplicar Migration

Se o trigger não existir, execute novamente:

```sql
-- Copiar e colar o conteúdo de:
-- supabase/migrations/20260212221000_billing_schema_sync.sql
```

---

## 📊 Verificação Completa

Execute o script de verificação completo:

```bash
# No Supabase Dashboard > SQL Editor
# Copiar e colar o conteúdo de:
# supabase/migrations/VERIFY_BILLING_SYSTEM.sql
```

---

## 🎉 Sucesso!

Se o contador incrementou corretamente:

✅ **Trigger automático está funcionando!**
✅ **Sistema de billing está operacional!**

**Próximos passos:**
1. Testar frontend (BillingPlans, BillingPolicies)
2. Implementar Edge Functions (Asaas integration)
3. Implementar componentes faltantes

---

## 📚 Documentação Relacionada

- `docs/BILLING_PATCH_GUIDE.md` - Guia completo de implementação
- `docs/BILLING_STATUS_FINAL.md` - Status atual e próximos passos
- `docs/billing-system-prd.md` - PRD completo do sistema
- `supabase/migrations/VERIFY_BILLING_SYSTEM.sql` - Script de verificação
