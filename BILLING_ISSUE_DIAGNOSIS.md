# 🩺 Diagnóstico do Sistema de Faturamento - Ifarma
**Data:** 18 de Fevereiro de 2026  
**Status Atual:** Crítico (Contador exibindo zero no frontend)

## 1. O Problema (O que o usuário vê)
Mesmo com pedidos sendo entregues e assinaturas ativas (ex: Plano Professional), o contador de "Limite de Pedidos" no `/gestor/billing` permanece em **0 de X grátis**. Em alguns casos, o sistema joga os pedidos diretamente para "Excedentes", ignorando a franquia grátis.

## 2. Origem do Problema (Causa Raiz)
Identificamos uma falha em cascata em três níveis:

### A. Falha no Motor de Regras (`get_pharmacy_billing_rules`)
A função que calcula quanto cada farmácia deve ter de limite estava retornando `NULL`. Isso acontecia porque ela dependia de uma tabela de configuração global (`billing_global_config`) que estava vazia. Sem uma base, o banco de dados "zerava" o limite da farmácia por segurança.

### B. Mismatch de Sincronização Realtime
O console do navegador exibe um erro de `mismatch between server and client bindings`. 
*   **O que significa:** O banco de dados não está configurado para enviar a estrutura completa dos dados nas atualizações (`REPLICA IDENTITY FULL`).
*   **Consequência:** O React tenta ouvir o banco, mas o banco fala uma "língua" que o React não entende, impedindo a atualização visual do contador sem um F5.

### C. Bloqueio de Segurança (RLS - Row Level Security)
As políticas de segurança originais não davam permissão explícita para o `owner_id` da farmácia ler a tabela `billing_cycles`. 
*   **Resultado:** O banco de dados bloqueia o acesso, o frontend não recebe nada e exibe `0` como valor padrão de fallback.

## 3. A Solução Implementada
Para resolver sem "gambiarras", implementamos o **Tiered Resolution Pattern**:

1.  **Blindagem do Motor de Regras:** A função agora inicializa com valores padrão (30 pedidos) e só sobrescreve se encontrar dados válidos nas tabelas de planos ou contratos.
2.  **Ciclos Rolantes de 30 Dias:** Mudamos de faturamento por "mês calendário" (dia 1 ao 30) para 30 dias a partir do pagamento/ativação, sincronizando com o fluxo financeiro do Asaas.
3.  **Nuclear RLS Fix:** Criamos políticas de segurança que garantem que tanto o Gestor (Dono) quanto o Admin consigam visualizar os dados, preservando a privacidade entre farmácias diferentes.

## 4. Próximos Passos Obrigatórios
Para que a documentação acima reflita a realidade, os seguintes itens precisam ser validados:
- [ ] Execução do script `FINAL_MERCHANT_BILLING_SYSTEM_FIX.sql`.
- [ ] Deploy das Edge Functions (`asaas-webhook`, `billing-cycle-close`).
- [ ] Limpeza de cache/Refresh no navegador para eliminar o erro de Realtime.
