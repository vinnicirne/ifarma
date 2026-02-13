# PRD: Sistema de Cobrança Configurável

**Versão:** 1.0 MVP  
**Data:** 2026-02-12  
**Status:** Ready for Implementation

---

## 🎯 Objetivo

Criar um sistema de cobrança automatizado e **100% configurável via painel Admin**, onde:

- ✅ Planos, regras e políticas são editáveis sem mexer em código
- ✅ Backend calcula e cobra usando parâmetros do banco
- ✅ Integração com Asaas para assinaturas e cobranças avulsas
- ✅ Auditoria completa de mudanças
- ✅ Contratos personalizados por farmácia

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    PAINEL ADMIN (Frontend)                  │
│  - Criar/editar planos                                      │
│  - Configurar políticas globais                             │
│  - Criar contratos personalizados                           │
│  - Visualizar faturas e receita                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Edge Functions)                   │
│  1. Lê configurações do banco (nunca hardcoded)             │
│  2. Resolve regras: Contrato > Plano > Global               │
│  3. Calcula: pedidos grátis + excedente                     │
│  4. Gera cobrança no Asaas (assinatura + avulsa)            │
│  5. Atualiza status via webhooks                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      ASAAS (Pagamentos)                     │
│  - Assinaturas mensais (plano)                              │
│  - Cobranças avulsas (excedente)                            │
│  - Webhooks (status de pagamento)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Modelo de Dados

### 1. `billing_plans` (Planos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `name` | text | "Free", "Pro", "Premium" |
| `monthly_fee_cents` | int | Mensalidade em centavos |
| `free_orders_per_period` | int | Pedidos grátis no período |
| `overage_percent_bp` | int | % sobre excedente (basis points: 500 = 5%) |
| `overage_fixed_fee_cents` | int | Taxa fixa por pedido excedente |
| `block_after_free_limit` | bool | Bloqueia após limite? (Free = true) |
| `is_active` | bool | Plano ativo? |
| `created_at` | timestamptz | - |
| `updated_at` | timestamptz | - |

**Seed Data (MVP):**
- **Free:** R$ 0/mês, 10 pedidos grátis, 5% excedente, bloqueia após limite
- **Pro:** R$ 99/mês, 100 pedidos grátis, 3% excedente
- **Premium:** R$ 299/mês, pedidos ilimitados, 0% excedente

---

### 2. `billing_global_config` (Configuração Global)

Fallback quando não há plano ou contrato.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK (singleton: sempre 1 registro) |
| `monthly_fee_cents` | int | Fallback mensalidade |
| `free_orders_per_period` | int | Fallback pedidos grátis |
| `overage_percent_bp` | int | Fallback % excedente |
| `overage_fixed_fee_cents` | int | Fallback taxa fixa |
| `block_after_free_limit` | bool | Fallback bloqueio |
| `updated_at` | timestamptz | - |

**Seed Data:**
- R$ 0/mês, 5 pedidos grátis, 10% excedente, bloqueia

---

### 3. `billing_policy` (Políticas Operacionais)

Regras de como o sistema funciona (singleton).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK (singleton) |
| `period_type` | text | `calendar_month` ou `rolling_30_days` |
| `count_on_delivered_only` | bool | Conta só entregue? (MVP = true) |
| `refund_policy` | text | `no_refund_count` ou `refund_within_days` |
| `refund_days` | int | Dias pra devolver (se aplicável) |
| `invoice_generation` | text | `auto` ou `manual` |
| `updated_at` | timestamptz | - |

**Seed Data (MVP):**
- `calendar_month`, `count_on_delivered_only = true`, `no_refund_count`, `auto`

---

### 4. `pharmacy_subscriptions` (Assinatura da Farmácia)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `pharmacy_id` | uuid | FK → pharmacies |
| `plan_id` | uuid | FK → billing_plans (nullable se contrato custom) |
| `asaas_subscription_id` | text | ID da assinatura no Asaas |
| `status` | text | `active`, `suspended`, `canceled` |
| `started_at` | timestamptz | Início da assinatura |
| `canceled_at` | timestamptz | Cancelamento |
| `created_at` | timestamptz | - |
| `updated_at` | timestamptz | - |

---

### 5. `pharmacy_contracts` (Contratos Personalizados)

Overrides por farmácia (nullable = usa plano).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `pharmacy_id` | uuid | FK → pharmacies (unique) |
| `monthly_fee_cents` | int | Override mensalidade (null = usa plano) |
| `free_orders_per_period` | int | Override pedidos grátis |
| `overage_percent_bp` | int | Override % excedente |
| `overage_fixed_fee_cents` | int | Override taxa fixa |
| `block_after_free_limit` | bool | Override bloqueio |
| `valid_from` | date | Início do contrato |
| `valid_until` | date | Fim do contrato (null = indefinido) |
| `notes` | text | Observações |
| `created_at` | timestamptz | - |
| `updated_at` | timestamptz | - |

---

### 6. `billing_cycles` (Ciclo Mensal por Farmácia)

Contador de pedidos no período.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `pharmacy_id` | uuid | FK → pharmacies |
| `period_start` | date | Início do período |
| `period_end` | date | Fim do período |
| `orders_count` | int | Pedidos contados no período |
| `free_orders_used` | int | Pedidos grátis usados |
| `overage_orders` | int | Pedidos excedentes |
| `overage_fee_cents` | int | Taxa calculada de excedente |
| `status` | text | `open`, `closed`, `invoiced` |
| `closed_at` | timestamptz | Quando fechou |
| `created_at` | timestamptz | - |
| `updated_at` | timestamptz | - |

**Índice:** `(pharmacy_id, period_start)` unique

---

### 7. `billing_invoices` (Faturas)

Histórico de cobranças no Asaas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `pharmacy_id` | uuid | FK → pharmacies |
| `cycle_id` | uuid | FK → billing_cycles (nullable) |
| `asaas_payment_id` | text | ID do pagamento no Asaas |
| `invoice_type` | text | `subscription` ou `overage` |
| `amount_cents` | int | Valor em centavos |
| `due_date` | date | Vencimento |
| `paid_at` | timestamptz | Quando foi pago |
| `status` | text | `pending`, `paid`, `overdue`, `canceled` |
| `asaas_invoice_url` | text | URL da fatura no Asaas |
| `created_at` | timestamptz | - |
| `updated_at` | timestamptz | - |

---

### 8. `audit_log` (Auditoria)

Rastreabilidade de mudanças.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `table_name` | text | Tabela alterada |
| `record_id` | uuid | ID do registro |
| `action` | text | `insert`, `update`, `delete` |
| `old_values` | jsonb | Valores antigos |
| `new_values` | jsonb | Valores novos |
| `changed_by` | uuid | FK → auth.users |
| `changed_at` | timestamptz | Timestamp |

---

## 🔐 Segurança (RLS)

### Regras de Acesso

| Tabela | Admin Global | Farmácia |
|--------|--------------|----------|
| `billing_plans` | CRUD | Read |
| `billing_global_config` | CRUD | - |
| `billing_policy` | CRUD | - |
| `pharmacy_subscriptions` | CRUD | Read (própria) |
| `pharmacy_contracts` | CRUD | Read (própria) |
| `billing_cycles` | Read All | Read (própria) |
| `billing_invoices` | Read All | Read (própria) |
| `audit_log` | Read All | - |

---

## 🎨 Telas do Painel

### Admin Global

1. **Planos** (`/admin/billing/plans`)
   - Lista de planos (tabela)
   - Criar/editar plano (modal)
   - Ativar/desativar plano

2. **Políticas** (`/admin/billing/policies`)
   - Configuração global (formulário)
   - Políticas operacionais (formulário)

3. **Farmácias** (`/admin/billing/pharmacies`)
   - Lista de farmácias + plano atual
   - Criar/editar contrato personalizado
   - Ver uso no mês (pedidos grátis vs excedente)

4. **Faturas** (`/admin/billing/invoices`)
   - Lista de faturas (todas farmácias)
   - Filtros: status, farmácia, período
   - Dashboard de receita (gráficos)

5. **Auditoria** (`/admin/billing/audit`)
   - Log de mudanças (quem, quando, o quê)

### Farmácia

1. **Meu Plano** (`/pharmacy/billing/plan`)
   - Plano atual
   - Pedidos grátis restantes
   - Histórico de uso

2. **Faturas** (`/pharmacy/billing/invoices`)
   - Faturas pendentes/pagas
   - Download de boletos
   - Status de pagamento

---

## ⚙️ Lógica de Resolução de Regras

```typescript
function resolveConfig(pharmacy_id: string) {
  // 1. Busca contrato personalizado
  const contract = await getContract(pharmacy_id);
  if (contract && contract.isValid()) {
    return contract; // Override total
  }

  // 2. Busca plano da assinatura
  const subscription = await getSubscription(pharmacy_id);
  if (subscription && subscription.plan) {
    return subscription.plan;
  }

  // 3. Fallback: config global
  return await getGlobalConfig();
}
```

---

## 🔄 Fluxo de Cobrança (Automático)

### 1. Cron Diário (Edge Function)

```
Todos os dias às 00:05 (horário de Brasília):
1. Busca ciclos abertos que terminaram ontem
2. Para cada ciclo:
   - Calcula excedente
   - Fecha o ciclo
   - Gera cobrança no Asaas (se houver excedente)
   - Cria registro em billing_invoices
```

### 2. Webhook Asaas

```
Quando Asaas notifica mudança de status:
1. Atualiza billing_invoices.status
2. Se pago: atualiza billing_cycles.status = 'invoiced'
3. Se vencido: notifica farmácia
```

---

## 📋 Checklist de Implementação

### Fase 1: Banco de Dados
- [ ] Migration SQL (schema + RLS + seed)
- [ ] Testar RLS com usuários Admin e Farmácia

### Fase 2: Edge Functions
- [ ] `billing-cycle-close` (cron diário)
- [ ] `billing-asaas-webhook` (recebe notificações)
- [ ] `billing-create-subscription` (cria assinatura no Asaas)

### Fase 3: Painel Admin
- [ ] Tela: Planos
- [ ] Tela: Políticas
- [ ] Tela: Farmácias (assinaturas + contratos)
- [ ] Tela: Faturas + Dashboard

### Fase 4: Painel Farmácia
- [ ] Tela: Meu Plano
- [ ] Tela: Faturas

### Fase 5: Testes
- [ ] Teste: Resolução de regras (contrato > plano > global)
- [ ] Teste: Cálculo de excedente
- [ ] Teste: Geração de fatura no Asaas
- [ ] Teste: Webhook de pagamento

---

## 🚀 Próximos Passos

1. **Criar migration SQL** → Schema + RLS + Seed
2. **Criar Edge Functions** → Cálculo + Asaas
3. **Criar componentes Admin** → Painel de configuração
4. **Testar fluxo completo** → Criar plano → Assinar → Gerar fatura

---

**Pronto para implementar!** 🎉
