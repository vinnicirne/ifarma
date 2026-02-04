-- ===============================================================
-- CONFIRMAÇÃO MANUAL DE E-MAIL (CORRIGIDO)
-- ===============================================================

UPDATE auth.users
SET 
    email_confirmed_at = NOW(),
    last_sign_in_at = NOW(),
    raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["email"]}'::jsonb
WHERE email = 'izabellefcirne@gmail.com';

-- (Agora vai funcionar sem erro de coluna gerada)
