-- Adicionar colunas de automação de mensagens na tabela pharmacies
ALTER TABLE pharmacies 
ADD COLUMN IF NOT EXISTS auto_message_accept_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_message_accept_text TEXT DEFAULT 'Olá! Recebemos seu pedido e já estamos preparando.',
ADD COLUMN IF NOT EXISTS auto_message_cancel_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_message_cancel_text TEXT DEFAULT 'Infelizmente tivemos que cancelar seu pedido por um motivo de força maior. Entre em contato para mais detalhes.';

-- Notificar o PostgREST para recarregar o cache (comentário apenas para o usuário)
-- NOTA: Se o erro "column not found in schema cache" persistir, 
-- acesse o Dashboard do Supabase -> API Settings -> PostgREST Config -> Reload Schema.
