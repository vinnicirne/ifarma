# PRD - Guia de Testes do Sistema iFarma

## 1. Visão Geral
Este documento define a estratégia, os cenários e os critérios de aceitação para o plano de testes do ecossistema iFarma. O objetivo é garantir que as três frentes do sistema (Cliente, Gestor e Motoboy) funcionem de forma integrada e resiliente, especialmente em fluxos críticos de pagamento, localização e tempo real.

---

## 2. Pontos de Atenção (Critical Path)
Estes são os módulos onde erros têm maior impacto no negócio:

*   **💳 Ciclo de Faturamento (Billing):** Verificação se os pedidos estão sendo descontados corretamente do saldo de `free_orders` e se o bloqueio de faturas vencidas está funcionando.
*   **📍 Geolocalização & Raio de Entrega:** Garantir que o cliente só veja farmácias que atendam seu endereço e que o cálculo de frete esteja preciso.
*   **⚡ Sincronização em Tempo Real:** O status do pedido deve mudar instantaneamente nas três telas (Cliente, Gestor, Motoboy) sem necessidade de refresh manual.
*   **💰 Checkout & Pagamentos (Asaas):** Processamento de PIX e Cartão, geração de QR Code e atualização automática de status após confirmação do webhook.
*   **📱 Notificações Push:** Garantir que os alertas de "Novo Pedido" e "Pedido a Caminho" cheguem mesmo com o app em segundo plano.

---

## 3. Matriz de Cenários de Teste

### 🛒 3.1. Aplicativo do Cliente
| ID | Cenário | Descrição | Resultado Esperado |
|:---|:---|:---|:---|
| CLT-01 | Busca & Filtro | Buscar produto por nome/princípio ativo. | Lista filtrada com preço e distância. |
| CLT-02 | Carrinho Multi-loja | Adicionar itens de farmácias diferentes. | Sistema deve avisar que o carrinho permite apenas uma loja por vez. |
| CLT-03 | Checkout (PIX) | Finalizar compra com PIX. | Confirmação de pagamento na entrega via maquininha do entregador. |
| CLT-04 | Rastreamento | Acompanhar deslocamento do Motoboy no mapa. | Ícone do motoboy se movendo em tempo real. |
| CLT-05 | Chat com Loja | Enviar mensagem durante o pedido. | Recebimento e notificação de resposta da farmácia. |

### 🏥 3.2. Painel do Gestor (Farmácia)
| ID | Cenário | Descrição | Resultado Esperado |
|:---|:---|:---|:---|
| GST-01 | Gestão de Pedidos | Aceitar, preparar e despachar pedido. | Status atualizado e sincronizado com Cliente. |
| GST-02 | Configuração de Raio | Alterar KM de entrega e valor do frete. | Refletido instantaneamente na visão do cliente. |
| GST-03 | Faturamento | Realizar 1 pedido 'entregue'. | Contador de `pedidos grátis` deve decrementar 1 unidade. |
| GST-04 | Impressão Térmica | Clicar em "Imprimir Pedido". | Geração do layout de cupom pronto para impressora Bluetooth/Rede. |
| GST-05 | Cadastro de Produto | Adicionar produto com foto e flag 'Genérico'. | Exibição correta com selo no app do cliente. |

### 🛵 3.3. Aplicativo do Motoboy
| ID | Cenário | Descrição | Resultado Esperado |
|:---|:---|:---|:---|
| MTB-01 | Aceite de Corrida | Receber alerta de pedido e aceitar. | Pedido movido para "Ativos" e rota liberada. |
| MTB-02 | Coleta (Pickup) | Confirmar retirada na farmácia. | Status altera para `em_rota`. |
| MTB-03 | Navegação | Abrir Google Maps/Waze via app. | Endereço do cliente passado corretamente via Intent. |
| MTB-04 | Finalização | Tirar foto do comprovante e finalizar. | Pedido marcado como `entregue` e valor creditado no saldo. |

---

## 4. Como Testar (Metodologia)

### 4.1. Testes de Unidade & Lógica (Frontend)
*   **Ferramenta:** `Vitest`.
*   **O que testar:** Funções de cálculo de distância, formatação de moeda e transformações de data.
*   **Comando:** `npm run test`.

### 4.2. Testes Integrados (Backend/Edge Functions)
*   **Ferramenta:** Supabase Dashboard (Logs) & Postman.
*   **O que testar:** Webhooks do Asaas, triggers de decremento de pedidos e provisionamento de usuários.
*   **Atenção:** Verificar logs em `Project Settings -> Edge Functions`.

### 4.3. Testes End-to-End (E2E)
*   **Ferramenta:** `Playwright` ou Manual via APK.
*   **O que testar:** O fluxo completo: *Cliente compra -> Farmácia Aceita -> Motoboy Entrega*.
*   **Recomendação:** Usar dois dispositivos reais (ou um simulador Android e uma aba Web no modo mobile devtools).

---

## 5. Checklist de Verificação de APK (Sanity Check)
Antes de enviar qualquer versão para produção:
1.  [ ] O app abre sem crashar (Splash Screen ok).
2.  [ ] Login e persistência de sessão funcionam.
3.  [ ] Permissões de Localização e Câmera solicitadas corretamente.
4.  [ ] Mapas carregam (chave API do Google válida).
5.  [ ] O banner de patrocinado segue o estilo visual PRD.

---

## 6. Infraestrutura de Teste
*   **Ambiente de Staging:** Subpoena Branch `dev` (se disponível).
*   **Usuários de Teste:**
    *   `test-cliente@ifarma.com`
    *   `test-gestor@ifarma.com`
    *   `test-motoboy@ifarma.com`
*   **Modo Sandbox Asaas:** Ativar para testar pagamentos sem custo real.
