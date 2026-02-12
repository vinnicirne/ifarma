-- ============================================
-- VERIFICADOR DE TOKENS: Verifique se o cliente tem token
-- Cole este SQL no Supabase Dashboard
-- ============================================

-- 1. Verifique se o usuário específico tem token
SELECT * 
FROM device_tokens 
WHERE user_id = 'cb4f3ff1-48e3-49d3-b949-ef10eb777f7b';

-- 2. Verifique se ALGUM usuário tem token
SELECT COUNT(*) as total_tokens FROM device_tokens;

-- ============================================
-- RESULTADO ESPERADO:
-- Se retornar 0 linhas, significa que o App/Site ainda não enviou o token.
-- Se retornar 1 ou mais linhas, o token existe e o envio DEVERIA funcionar.
-- ============================================
