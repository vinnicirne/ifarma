-- Script de Diagnóstico: Testar Trigger handle_new_user
-- Execute este script no Supabase SQL Editor para diagnosticar o problema

-- 1. Verificar se a coluna pharmacy_id existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('pharmacy_id', 'phone', 'role', 'created_at', 'updated_at');

-- 2. Verificar o constraint de role
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_role_check';

-- 3. Ver a definição atual do trigger
SELECT tgname, tgfoid::regproc, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 4. Ver a função atual
SELECT pg_get_functiondef('public.handle_new_user'::regproc);
