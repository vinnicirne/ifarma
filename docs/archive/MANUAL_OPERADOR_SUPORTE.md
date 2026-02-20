# 📘 Manual do Operador de Suporte - Ifarma Admin

> **Versão:** 1.0 (Sistema v3.0 - God Mode)  
> **Público Alvo:** Equipe de Suporte e Operações
> **Objetivo:** Guia completo para monitoramento, gestão e resolução de problemas na plataforma Ifarma.

---

## 🚀 1. Visão Geral (Dashboard)

A tela inicial é o **Centro de Comando**. Ela foi projetada para que você identifique problemas em segundos, sem precisar navegar.

### 🏥 System Health (Saúde do Sistema)
No topo da tela, você verá 3 cards cruciais:

1.  **Farmácias Fechadas (OFF):**
    *   **O que é:** Mostra quantas farmácias aprovadas estão *offline* ou fechadas no momento.
    *   **Ação:** Se o número for alto em horário comercial, pode indicar um problema no app dos lojistas. Clique para ver a lista e entrar em contato.
    
2.  **Estoque Crítico:**
    *   **O que é:** Produtos com menos de 5 unidades em estoque em toda a rede.
    *   **Ação:** Monitorar para avisar as farmácias chave de repor produtos populares.

3.  **Promoções Ativas:**
    *   **O que é:** Campanhas de marketing rodando no app do cliente.
    *   **Ação:** Garantir que sempre haja pelo menos uma campanha ativa para engajar usuários.

### 📊 Gráficos e Métricas
*   **Vendas Hoje:** Total transacionado no dia.
*   **Pedidos Ativos:** Pedidos que ainda não foram entregues.
*   **Top Produtos:** Lista em tempo real do que está vendendo mais. Use isso para sugerir promoções.

---

## 🏪 2. Gestão de Farmácias

Acesse pelo menu lateral **"Farmácias"**.

### Funcionalidades
*   **Aprovação:** Novas farmácias aparecem com status `Pendente`.
    *   **Como fazer:** Clique em "Ver Detalhes" > Confira o CNPJ e Endereço > Clique em "Aprovar" (Verde) ou "Rejeitar" (Vermelho).
*   **Suspensão:** Se uma farmácia violar regras, você pode mudar o status para `Suspenso`. Ela sumirá imediatamente do app dos clientes.
*   **Login Como (God Mode):** Em casos extremos de suporte, você pode usar a função administrativa para ver o painel *como se fosse o dono da farmácia* (recurso restrito a Super Admins).

---

## 🛵 3. Monitoramento de Pedidos e Entregas

Acesse pelo menu **"Pedidos"**.

### Status do Pedido
Entenda o ciclo de vida para ajudar o cliente:
1.  **Pendente:** Cliente pagou, farmácia ainda não aceitou. (Crítico: Se demorar > 5min, ligue para a farmácia).
2.  **Preparando:** Farmácia aceitou e está separando.
3.  **Aguardando Entregador:** Farmácia chamou o motoboy.
4.  **Em Rota:** Motoboy retirou e está indo ao cliente.
5.  **Concluído:** Entregue com sucesso.

### Problemas Comuns
*   **"O motoboy não chega":** Verifique o mapa em tempo real. Se ele estiver parado há muito tempo, entre em contato.
*   **"Farmácia não aceita":** O painel mostrará o tempo de espera. Se exceder o limite, o suporte deve intervir.

---

## 🔔 4. Central de Notificações

Acesse pelo menu **"Notificações"**.

Use com sabedoria! Isso envia alertas para o celular de **todos** os usuários.

*   **Título:** Seja curto e chamativo (ex: "💊 Oferta Relâmpago!").
*   **Mensagem:** Explique o benefício claro (ex: "Frete grátis em toda a linha infantil hoje.").
*   **Público Alvo:**
    *   *Todos:* Avisos gerais de sistema.
    *   *Clientes:* Promoções de venda.
    *   *Farmácias:* Avisos sobre taxas ou atualizações do painel.
    *   *Motoboys:* Avisos sobre alta demanda ou bônus.

---

## 📦 5. Produtos e Categorias

Acesse pelo menu **"Produtos"**.

*   **Auditoria:** O suporte pode ver produtos proibidos ou cadastrados errados.
*   **Edição Rápida:** Você pode desativar um produto problemático globalmente se necessário.
*   **Categorias:** Organização do app do cliente. Se um produto não aparece, verifique se a categoria dele está ativa aqui.

---

## 🛠️ Suporte Técnico (Troubleshooting)

Se um usuário relatar erro:

1.  **Peça o ID do Pedido ou Email.**
2.  **Verifique os Logs:** O painel mostra ações recentes.
3.  **Limpeza de Cache:** Instrua o usuário a fechar e abrir o app.
4.  **Escalação:** Se for erro de sistema (tela branca, botão não funciona), reporte ao time de Desenv com print e passo a passo.

---

> **Lembre-se:** O Operador de Suporte é a voz da Ifarma. Use o painel para resolver problemas proativamente, antes que o cliente reclame!
