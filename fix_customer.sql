-- Limpar customer ID inválido para forçar recriação
UPDATE pharmacies 
SET 
  asaas_customer_id = NULL,
  asaas_status = NULL,
  asaas_last_error = NULL
WHERE id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746';

-- Verificar dados atuais da farmácia
SELECT 
  id,
  name,
  cnpj,
  owner_phone,
  establishment_phone,
  contact_phone,
  owner_email,
  email,
  asaas_customer_id,
  asaas_status
FROM pharmacies 
WHERE id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746';
