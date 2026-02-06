# 📄 Documentação da API e Integração Ifarma

Esta documentação detalha como o ecossistema Ifarma se comunica e como novos parceiros ou desenvolvedores podem interagir com a plataforma.

## 🔑 Autenticação

O Ifarma utiliza o **Supabase Auth** (JWT). Toda requisição para as tabelas protegidas deve incluir o cabeçalho `Authorization: Bearer <JWT_TOKEN>`.

- **Níveis de Acesso (Roles):**
  - `customer`: Acesso a compras e tracking.
  - `pharmacy`: Gestão da loja e pedidos.
  - `motoboy`: Acesso a entregas e localização.
  - `admin`: Controle global do sistema.

---

## 🏗️ Estrutura de Tabelas (Banco de Dados)

### 1. `pharmacies` (Lojas Parceiras)
Armazena os dados das farmácias registradas.
- `id`: Identificador único.
- `name`: Nome da farmácia.
- `address`: Endereço completo.
- `is_open`: Status de funcionamento (Boolean).
- `auto_message_accept_enabled`: Automação de resposta.

### 2. `products` (Catálogo)
Vinculado a uma farmácia.
- `pharmacy_id`: Referência à farmácia.
- `price`, `promo_price`: Valores do item.
- `requires_prescription`: Indica necessidade de receita médica.

### 3. `orders` (Pedidos)
O coração do ecossistema.
- `status`: [pendente, preparando, aguardando_motoboy, em_rota, entregue, cancelado].
- `customer_id`, `pharmacy_id`, `motoboy_id`: Relações.
- `cancellation_reason`: Motivo caso o pedido seja cancelado.

---

## 📡 Webhooks e Realtime

O app utiliza o protocolo **Realtime do PostgreSQL** via Supabase para atualizações instantâneas:

- **Tracking:** O app do cliente escuta a tabela `orders` para mudanças de status e a tabela `profiles` (ou uma tabela específica de localização) para rastreio GPS.
- **Chat:** Inserções na tabela `order_messages` disparam notificações instantâneas no app do receptor.

### Exemplo de subscrição em JS:
```javascript
const channel = supabase
  .channel('order-updates')
  .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'id=eq.ID_DO_PEDIDO' }, 
      (payload) => console.log('Novo status:', payload.new.status))
  .subscribe()
```

---

## 📱 Integração para Novos Parceiros

Farmácias interessadas em integrar seus softwares de ERP com o Ifarma podem utilizar as **Edge Functions** do Supabase para sincronização de estoque e pedidos automáticos.

**Passos para Integração:**
1. Solicitar uma `service_role_key` (via suporte).
2. Utilizar o endpoint de `upsert` na tabela `products` para sincronizar preços.
3. Escutar o evento `INSERT` na tabela `orders` para receber pedidos direto no PDV da loja.

---

## 🛠️ Suporte ao Desenvolvedor

Para dúvidas técnicas, abra uma Issue no repositório ou entre em contato com `dev@ifarma.com.br`.
