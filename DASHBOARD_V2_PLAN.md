# Plano de Reformulação - Admin Dashboard v2

Este documento detalha o status atual, as mudanças realizadas e os próximos passos para a padronização e otimização do painel administrativo do Ifarma.

## 1. Organização do Dashboard (UX/Design)

### Menu Lateral (Sidebar) - Reformulado
O menu lateral foi reestruturado para agrupar funcionalidades por domínios de negócio, reduzindo a carga cognitiva e melhorando a navegabilidade.

**Estrutura Nova:**
- **PRINCIPAL**: Dashboard (Visão Geral)
- **OPERAÇÃO**: Pedidos & Mapa (Live Tracking), Gestão de Motoboys
- **CRESCIMENTO**: Cupons & Promoções, Clientes (CRM)
- **CATÁLOGO**: Produtos (Placeholder), Categorias (Placeholder)
- **PARCEIROS**: Farmácias
- **FINANCEIRO**: Visão Financeira (Vendas/Repasses)
- **SISTEMA**: Configurações (API, Chaves, Notificações), Logs

### Padronização de Nomenclatura
- **Antes**: Dashboard, Tracking, Motoboys, Pharmacies, Settings.
- **Depois (Consistente)**: Dashboard, Pedidos & Mapa, Motoboys, Farmácias, Ajustes do Sistema.

---

## 2. Caça a Duplicidade Técnica (Code Audit)

### Itens Identificados e Unificados
1.  **Cálculo de Distância (GeoUtils)**:
    - **Problema**: `calculateDistance` (Haversine) estava definido localmente em `OrderTracking.tsx` e `lib/geoUtils.ts`.
    - **Ação**: Unificado em `src/lib/geoUtils.ts`. `OrderTracking.tsx` agora importa do lib.
2.  **Ícones de Material Design (MaterialIcon)**:
    - **Problema**: Múltiplas redefinições locais do componente `MaterialIcon` em arquivos como `MerchantOrderManagement.tsx` para evitar dependências.
    - **Ação Sugerida**: Mover o componente para um diretório de UI global e garantir que todos os módulos o utilizem.
3.  **Lógica de Roteamento/Direções**:
    - **Problema**: `useDirections` (Google), `useRouteData` (OSRM) e lógica interna em `useMotoboyMap.ts`.
    - **Ação Sugerida**: Criar um `MapProvider` ou um hook unificado `useRoute` que suporte múltiplos provedores com fallback automático.

---

## 3. Padrões e Convenções (Guidelines v1)

Para manter a consistência do projeto na V2, todos os desenvolvedores (e IAs) devem seguir:

### Estrutura de Pastas
- `src/components/admin/`: Componentes exclusivos do painel admin.
- `src/pages/admin/`: Páginas do painel admin.
- `src/lib/`: Instâncias de clientes (Supabase, API).
- `src/hooks/`: Lógica de estado e efeitos reutilizáveis.
- `src/services/`: Chamadas complexas para Edge Functions ou APIs externas.

### Localização de Queries (SQL/RPC)
- Consultas simples: Direto no componente via `supabase.from()`.
- Lógicas complexas ou que exigem Atomicidade: **RPC (Remote Procedure Call)** no PostgreSQL.
- Regras de segurança: Sempre via **RLS (Row Level Security)**.

### Tratamento de Erros e Logs
- Usar blocos `try/catch` em todas as operações de escrita.
- Logs críticos devem ser salvos na tabela `system_logs` (ou similar) via Supabase.

---

## 4. Plano de Migração

1.  **Fase 1 (Concluída)**: Reestruturação do Menu e Unificação do GeoUtils.
2.  **Fase 2 (Próxima)**: Unificação do componente `MaterialIcon` e limpeza de redefinições locais.
3.  **Fase 3**: Implementação das páginas de Catálogo (Produtos/Categorias) que hoje são placeholders.
4.  **Fase 4**: Auditoria de RLS nas tabelas `orders` e `pharmacies` para garantir multi-tenancy robusta.

---

**Assinado:** I.A. Antigravity | Equipe Ifarma 2025
