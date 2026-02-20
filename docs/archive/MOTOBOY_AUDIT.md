# 🚚 Auditoria do Módulo Motoboy (Entregas & Rastreamento)

**Date:** 2026-02-07  
**Auditor:** @[backend-specialist] & @[frontend-specialist]  
**Escopo:** `src/pages/motoboy`, `hooks`, `Edge Functions` e `RLS`.

---

## 📊 Resumo dos Achados

| ID | Achado | Sev | Impacto | Componente | Correção Sugerida |
|----|--------|-----|---------|------------|-------------------|
| **#1** | **Duplicação de Rastreamento (Tripla Escrita)** | **P2** | Desperdício de banco e requests. O app escreve em `route_history` (Front), `location_history` (Edge) e `profiles` (Front + Edge) simultaneamente. | `useGeolocation.ts` | Centralizar escrita na Edge Function ou no Front. Remover tabela redundante. |
| **#2** | **Fallback de GPS com Lógica Falha** | **P1** | O "Fallback" no `useGeolocation` executa **SEMPRE**, mesmo se a Edge Function funcionar. Duplica dados em 100% dos casos. | `useGeolocation.ts` | Adicionar `if (!success) { insert_fallback }`. |
| **#3** | **Sons de Notificação Duplicados** | **P2** | O hook `useMotoboyQueue` e a página `MotoboyOrders` tocam sons para o mesmo evento `UPDATE`. Usuário ouve eco/barulho excessivo. | `MotoboyOrders.tsx` | Remover listener de som duplicado da página e deixar centralizado no Hook. |
| **#4** | **Inconsistência de Tabelas de Histórico** | **P3** | Edge grava em `location_history` mas Front grava em `route_history`. Dados fragmentados. | `tracking-engine` | Padronizar para `route_history` (já usada em políticas RLS). |
| **#5** | **Subscrições Realtime Redundantes** | **P2** | `Dashboard` e `Orders` abrem canais socket separados para a mesma tabela `orders`. | `MotoboyOrders.tsx` | Usar Contexto Global ou garantir unmount limpo (O React Query ajudaria aqui). |
| **#6** | **Segurança: Tabela `location_history` sem RLS?** | **P0** | Verifiquei que `route_history` tem RLS, mas `location_history` (usada pela Edge) não foi validada nas migrações recentes. | Database | Garantir que `location_history` tenha RLS ou seja removida. |
| **#7** | **Chat Sem Notificações (Silencioso)** | **P0** | Mensagens enviadas no chat não disparam Push Notification. O app espera o hook mas ele não existe no banco. | `order-notifier` | Criar Trigger `on_chat_message` e atualizar Edge Function. (FEITO) |

---

## 🛠️ Detalhes e Correções (P0/P1)

### #1 & #2 & #4: Otimização Crítica de Rastreamento (P1)

O fluxo atual faz 3 gravações a cada ~5 segundos por motoboy. Isso escala mal.

**Correção:**
1.  Frontend chama **apenas** a Edge Function `tracking-engine`.
2.  Edge Function grava no `route_history` (tabela oficial) e atualiza `profiles`.
3.  Frontend só faz fallback se a Edge Function falhar (retornar erro).

**Patch Sugerido (`src/hooks/useGeolocation.ts`):**

```typescript
// ... dentro do watcher
if (shouldUpdateDB) {
    lastUpdate.current = { lat: latitude, lng: longitude, time: now };
    
    // 1. Tentar via Edge Function (Ideal para logica server-side futura)
    const { error: edgeError } = await supabase.functions.invoke('tracking-engine', {
        body: { motoboyId: userId, latitude, longitude, orderId }
    });

    // 2. Fallback APENAS se falhar
    if (edgeError) {
        console.warn('Edge falhou, usando fallback direto via DB');
        await supabase.from('route_history').insert({
            motoboy_id: userId,
            order_id: orderId,
            latitude,
            longitude
        });
        
        // Atualizar perfil diretamente também se edge falhar
        await supabase.from('profiles').update({
            last_lat: latitude, 
            last_lng: longitude
        }).eq('id', userId);
    }
}
```

### #6: Unificação das Tabelas (P0)

A Edge Function está gravando em `location_history` (que parece ser legado/não monitorado pelo AdminMap). Devemos apontar tudo para `route_history`.

**Ação:** Atualizar `supabase/functions/tracking-engine/index.ts` para usar `route_history`.

---

## 🧹 Limpeza (P3)

-   **Remover `location_history`**: Se não houver dados vitais, dropar a tabela e usar apenas `route_history`.
-   **Centralizar Sons**: Remover a lógica de `playAudio` de dentro do `useEffect` em `MotoboyOrders.tsx` e confiar no alerta global do `useMotoboyQueue`.

---

## 🚀 Próximos Passos Aprovados?

Posso aplicar as correções **P1 (Geolocation Fix)** e **P0 (Unificação de Tabelas)** agora?
Isso vai economizar ~60% de escritas no banco e garantir que o histórico de rota seja realmente gravado onde o Admin espera ver.
