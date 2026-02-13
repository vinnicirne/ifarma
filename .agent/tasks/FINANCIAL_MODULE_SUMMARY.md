# 📦 Módulo Financeiro MVP+ - Entrega Completa

## ✅ O Que Foi Criado

### 1. **Plano de Implementação** 
📄 `.agent/tasks/financial-module-mvp.md`
- Arquitetura completa do sistema
- Estrutura de dados (8 tabelas)
- Fluxo de cobrança (4 fases)
- Integração Asaas (endpoints + webhooks)
- Telas do painel (Admin + Farmácia)
- Cronograma (12 dias úteis)

### 2. **Schema SQL Completo**
📄 `supabase/migrations/20260212_financial_module_schema.sql`
- ✅ 8 tabelas (planos, assinaturas, ciclos, faturas, contratos, auditoria)
- ✅ Função `get_pharmacy_billing_rules()` (resolve cascata: contrato > plano > global)
- ✅ Trigger automático (incrementa contador ao entregar pedido)
- ✅ RLS completo (Admin total / Farmácia próprios dados)
- ✅ Auditoria automática (log de mudanças)
- ✅ Seed data (3 planos padrão + políticas MVP)

### 3. **Tipos TypeScript**
📄 `src/types/billing.ts`
- ✅ Interfaces completas (todas as tabelas)
- ✅ Tipos compostos (com joins)
- ✅ Helpers (formatação de moeda, percentual, labels)
- ✅ Validações (planos, contratos)

### 4. **Edge Functions (4 funções)**

#### 📄 `supabase/functions/reset-billing-cycles/index.ts`
- **Quando**: Cron diário (00:05 UTC)
- **O que faz**: Cria novos ciclos no dia 1º do mês para farmácias ativas

#### 📄 `supabase/functions/close-billing-cycles/index.ts`
- **Quando**: Cron diário (01:00 UTC)
- **O que faz**: Fecha ciclos do mês anterior + gera faturas de excedente no Asaas

#### 📄 `supabase/functions/asaas-webhook/index.ts`
- **Quando**: Webhook do Asaas
- **O que faz**: Atualiza status de faturas (paid/overdue/canceled)

#### 📄 `supabase/functions/activate-pharmacy-plan/index.ts`
- **Quando**: Admin ativa plano de farmácia
- **O que faz**: Cria cliente Asaas + assinatura + ciclo inicial

### 5. **Guia de Implementação**
📄 `.agent/tasks/FINANCIAL_MODULE_README.md`
- ✅ Passo a passo completo (deploy, config, testes)
- ✅ Exemplos de código (hooks, queries)
- ✅ Troubleshooting
- ✅ Monitoramento (queries úteis)

---

## 🎯 Arquitetura Final

```
┌─────────────────────────────────────────────────────────────┐
│                      PAINEL ADMIN                           │
│  • Criar/editar planos                                      │
│  • Configurar políticas operacionais                        │
│  • Atribuir planos a farmácias                              │
│  • Criar contratos personalizados                           │
│  • Visualizar receita (MRR + uso)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                           │
│  • billing_plans (Free, Pro, Premium)                       │
│  • billing_policy (período, contagem, geração)              │
│  • pharmacy_subscriptions (qual plano cada farmácia tem)    │
│  • pharmacy_contracts (overrides personalizados)            │
│  • billing_cycles (contador mensal de pedidos)              │
│  • billing_invoices (histórico Asaas)                       │
│  • billing_audit_log (auditoria de mudanças)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   EDGE FUNCTIONS                            │
│  • reset-billing-cycles (cron dia 1º - 00:05)               │
│  • close-billing-cycles (cron dia 1º - 01:00)               │
│  • asaas-webhook (recebe notificações)                      │
│  • activate-pharmacy-plan (ativa plano)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        ASAAS                                │
│  • Assinaturas (mensalidade recorrente)                     │
│  • Cobranças avulsas (excedente)                            │
│  • Webhooks (atualiza status)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   PAINEL FARMÁCIA                           │
│  • Ver plano atual                                          │
│  • Acompanhar uso no mês (barra de progresso)               │
│  • Ver faturas e pagar                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Cobrança (Resumo)

### 1️⃣ Início do Mês (Dia 1)
```
reset-billing-cycles (cron)
  → Cria novo ciclo para cada farmácia ativa
  → Zera contadores (free_orders_used = 0, overage_orders = 0)
```

### 2️⃣ Durante o Mês (Pedido Entregue)
```
Trigger on orders (status = delivered)
  → Busca ciclo ativo
  → Resolve regras (contrato > plano > global)
  → Se dentro do limite: incrementa free_orders_used
  → Se excedeu: incrementa overage_orders + calcula valor
```

### 3️⃣ Fim do Mês (Dia 1 do mês seguinte)
```
close-billing-cycles (cron)
  → Fecha ciclos do mês anterior
  → Se overage_orders > 0:
    → Cria fatura no Asaas
    → Salva em billing_invoices
  → Marca ciclo como "invoiced"
```

### 4️⃣ Mensalidade (Recorrente)
```
Asaas Subscription (criada na ativação do plano)
  → Cobra mensalidade todo dia 1º
  → Webhook atualiza status (paid/overdue)
```

---

## 🚀 Próximos Passos (Implementação)

### Fase 1: Banco de Dados (Hoje)
```bash
# 1. Aplicar migration
supabase db push

# 2. Verificar tabelas
supabase db diff
```

### Fase 2: Edge Functions (Amanhã)
```bash
# 1. Deploy das funções
supabase functions deploy close-billing-cycles
supabase functions deploy reset-billing-cycles
supabase functions deploy asaas-webhook
supabase functions deploy activate-pharmacy-plan

# 2. Configurar variáveis de ambiente (Supabase Dashboard)
ASAAS_API_KEY=...
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=...

# 3. Configurar cron jobs (SQL no Dashboard)
# (Ver FINANCIAL_MODULE_README.md)
```

### Fase 3: Front-End (3-4 dias)
```
Admin:
  ✅ Tela de Planos
  ✅ Tela de Políticas
  ✅ Tela de Assinaturas
  ✅ Tela de Contratos
  ✅ Tela de Receita

Farmácia:
  ✅ Meu Plano
  ✅ Uso no Mês
  ✅ Faturas
```

### Fase 4: Testes (2 dias)
```
✅ Ativar plano (sandbox Asaas)
✅ Simular pedidos (incrementar contador)
✅ Forçar fechamento de ciclo
✅ Testar webhook (pagamento recebido/vencido)
✅ Validar RLS (farmácia não vê dados de outras)
```

---

## 📊 Premissas MVP (Confirmadas)

| Configuração | Valor |
|--------------|-------|
| **Período de cobrança** | Mês calendário (1º ao último dia) |
| **Quando conta pedido** | Apenas quando `status = delivered` |
| **Geração de fatura** | Automática (cron dia 1º às 01:00) |
| **Política de devolução** | Não desconta do limite |
| **Bloqueio por inadimplência** | ❌ Fora do MVP (apenas aviso) |

**Tudo configurável via painel** (`billing_policy`)

---

## 🎁 Bônus: Queries Úteis

### Ver status de uma farmácia
```sql
SELECT 
  p.name AS farmacia,
  bp.name AS plano,
  bc.free_orders_used,
  bc.overage_orders,
  bc.overage_amount_cents / 100.0 AS valor_excedente,
  ps.status AS status_assinatura
FROM pharmacies p
JOIN pharmacy_subscriptions ps ON ps.pharmacy_id = p.id
JOIN billing_plans bp ON bp.id = ps.plan_id
LEFT JOIN billing_cycles bc ON bc.pharmacy_id = p.id AND bc.status = 'active'
WHERE p.id = 'uuid-da-farmacia';
```

### Ver receita do mês
```sql
-- MRR (mensalidade)
SELECT SUM(bp.monthly_fee_cents) / 100.0 AS mrr
FROM pharmacy_subscriptions ps
JOIN billing_plans bp ON bp.id = ps.plan_id
WHERE ps.status = 'active';

-- Receita por uso (mês atual)
SELECT SUM(overage_amount_cents) / 100.0 AS overage_revenue
FROM billing_cycles
WHERE period_start >= DATE_TRUNC('month', CURRENT_DATE)
  AND status IN ('active', 'closed', 'invoiced');
```

---

## 🎯 Resultado Final

✅ **Sistema 100% configurável via painel**
✅ **Sem valores hardcoded no código**
✅ **Cascata de regras** (contrato > plano > global)
✅ **Automação completa** (cron + triggers + webhooks)
✅ **Auditoria total** (quem mudou o quê e quando)
✅ **Escalável** (fácil adicionar novos planos/políticas)
✅ **Seguro** (RLS + validações + retry automático)

---

**Tudo pronto para começar a implementação! 🚀**

Alguma dúvida ou ajuste necessário antes de partir para o código?
