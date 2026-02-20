# 🔔 Setup de Notificações para Motoboys (Edge Functions)

**Objetivo:** Enviar Push Notification (FCM) com ALERTA SONORO ALTO para o Motoboy quando ele receber uma nova entrega.

---

## 🚀 Passo 1: Configurar Variáveis de Ambiente (Se já fez, pule)

```bash
supabase secrets set FIREBASE_SERVER_KEY="SUA_CHAVE_FIREBASE"
supabase secrets set SUPABASE_URL="https://seu-projeto.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
```

## 📦 Passo 2: Deploy da Edge Function de Motoboy

```bash
# Deploy da função motoboy-notifier
supabase functions deploy motoboy-notifier
```

## 🔗 Passo 3: Criar o Trigger no Banco

1.  Abra o arquivo `setup_motoboy_trigger.sql` gerado na pasta raiz.
2.  (Opcional) Verifique se o ID do projeto e Anon Key estão corretos (já preenchi com base no histórico).
3.  Execute o script no SQL Editor do Supabase Dashboard.

### Como funciona?

1.  Gerente atribui um pedido via Dashboard (`UPDATE orders SET motoboy_id = ...`).
2.  O **Trigger** (`on_motoboy_assigned`) dispara apenas se `motoboy_id` mudou.
3.  A função PL/pgSQL chama a **Edge Function** (`motoboy-notifier`).
4.  A Edge Function envia o push com `android_channel_id: 'chat_bibi_channel'` (Canal que configuramos para som alto).
5.  O celular do Motoboy toca o alerta "BI BI" ou similar.

---
