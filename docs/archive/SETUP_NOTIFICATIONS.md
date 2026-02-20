# 🔔 Setup de Notificações de Novo Pedido (Edge Functions)

**Objetivo:** Enviar Push Notification (FCM) para o Gerente da Farmácia AUTOMATICAMENTE quando um novo pedido é criado, mesmo com o app fechado.

---

## 🚀 Passo 1: Configurar Variáveis de Ambiente

No terminal, execute:

```bash
# 1. Obtenha a chave de servidor do Firebase (Project Settings > Cloud Messaging)
# 2. Obtenha a URL do Supabase e Service Role Key (Dashboard > Settings > API)

supabase secrets set FIREBASE_SERVER_KEY="SUA_CHAVE_FIREBASE"
supabase secrets set SUPABASE_URL="https://seu-projeto.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
```

## 📦 Passo 2: Deploy da Edge Function

```bash
# Se ainda não fez login
supabase login

# Deploy da função order-notifier
supabase functions deploy order-notifier
```

## 🔗 Passo 3: Criar o Trigger no Banco

1.  Abra o arquivo `setup_notifications_trigger.sql` gerado na pasta raiz.
2.  Substitua `<PROJECT_REF>` pelo ID do seu projeto (ex: `abcdefgh`).
3.  Substitua `<ANON_KEY>` pela sua chave pública (ou service_role se necessário).
4.  Execute o script no SQL Editor do Supabase Dashboard.

### Como funciona?

1.  **Client/App** insere um novo pedido na tabela `orders`.
2.  O **Trigger** (`on_order_created`) dispara.
3.  A função PL/pgSQL chama a **Edge Function** (`order-notifier`) via HTTP POST.
4.  A Edge Function:
    -   Busca o dono da farmácia (`pharmacies` -> `owner_id`).
    -   Busca os tokens FCM dele (`device_tokens`).
    -   Envia a notificação para o Firebase (FCM).
5.  O Gerente recebe o alerta "💰 Novo Pedido!" no celular.

---

## ✅ Teste Manual

Você pode testar a função diretamente via curl (substitua a URL e Authorization):

```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/order-notifier' \
--header 'Authorization: Bearer <ANON_KEY>' \
--header 'Content-Type: application/json' \
--data '{
    "type": "INSERT",
    "table": "orders",
    "record": {
        "id": "test-uuid",
        "pharmacy_id": "pharmacy-uuid",
        "total_price": 50.00
    }
}'
```
