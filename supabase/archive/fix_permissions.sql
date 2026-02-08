-- Restaurar permissões totais para o 'service_role' (chave secreta)
GRANT ALL ON TABLE public.profiles TO service_role;

-- Garantir que ele possa ver tudo (bypass RLS explícito se necessário, embora service_role já deva ter)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY; -- Apenas garante que RLS está ativo (mas service_role ignora)

-- Se houver policies bloqueando, service_role ignora.
-- O problema provavel é falta de GRANT básico (SELECT/INSERT/UPDATE)

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

-- Também garantir na tabela de usuários auth (just in case, mas geralmente acessada via API)
-- Não podemos rodar grant em auth.users facilmente via editor SQL simples as vezes, mas profiles é o foco.

-- Verificação final
SELECT * FROM public.profiles LIMIT 1;
