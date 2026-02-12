# Documentação do Módulo: Pedidos & Mapa (Order Tracking)

## Objetivo
O módulo de **Pedidos & Mapa** é o coração operacional do sistema, permitindo que administradores visualizem em tempo real a localização dos motoboys (frota) e o status de todos os pedidos ativos.

## Usuários
- **Administrador**: Visão global de todas as farmácias e motoboys.
- **Operador de Suporte**: Monitoramento de pedidos atrasados e intervenção em entregas.

## Telas e Componentes
- **OrderTracking.tsx**: Página principal que contém a lista de pedidos e o mapa.
- **AdminMap.tsx**: Componente de mapa (Google Maps) que renderiza markers e rotas.
- **AssignDriverModal**: Modal para atribuição manual de motoboys a pedidos.

## Dependências
- `google-maps-api`: Renderização do mapa.
- `supabase-realtime`: Atualização instantânea da posição dos motoboys (tabela `profiles`).
- `geoUtils.ts`: Cálculo de distância (Haversine).

## Fluxo de Uso
1. Acesse **Operação > Pedidos & Mapa**.
2. Visualize o painel esquerdo com pedidos ativos.
3. Se um pedido estiver "Aguardando Entregador", clique em **Atribuir**.
4. O sistema lista motoboys próximos ordenados por distância.
5. Selecione o motoboy para disparar a notificação.

## Checklist de Qualidade
- [x] Marcadores de farmácia e motoboy visíveis.
- [x] Atualização sem refresh (Real-time).
- [x] Filtros por status do pedido.
- [x] Responsividade para visão desktop/tablet.

## Histórico de Logs/Ações
- Implementado cálculo de distância automático.
- Atualizado sistema de filtros para status V2.

## Recomendações
- Implementar "Auto-assignment" baseado em fila.
- Adicionar previsão de tempo de chegada (ETA) usando Directions API.
