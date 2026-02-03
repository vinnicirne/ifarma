-- Migration Tracking System
-- Tabela para controlar versões de migrations aplicadas

-- Criar tabela de controle de versões
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    applied_by VARCHAR(255) DEFAULT current_user,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rolled_back')),
    error_message TEXT,
    CONSTRAINT version_format CHECK (version ~ '^\d{3}_.*$')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON public.schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON public.schema_migrations(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_status ON public.schema_migrations(status);

-- Comentários
COMMENT ON TABLE public.schema_migrations IS 'Tabela de controle de migrations aplicadas ao banco de dados';
COMMENT ON COLUMN public.schema_migrations.version IS 'Número da versão (ex: 001_initial_schema)';
COMMENT ON COLUMN public.schema_migrations.name IS 'Nome descritivo da migration';
COMMENT ON COLUMN public.schema_migrations.applied_at IS 'Data e hora de aplicação';
COMMENT ON COLUMN public.schema_migrations.checksum IS 'MD5 hash do arquivo de migration';
COMMENT ON COLUMN public.schema_migrations.execution_time_ms IS 'Tempo de execução em milissegundos';
COMMENT ON COLUMN public.schema_migrations.status IS 'Status da migration (success, failed, rolled_back)';

-- Função para registrar migration
CREATE OR REPLACE FUNCTION public.register_migration(
    p_version VARCHAR(255),
    p_name VARCHAR(500),
    p_checksum VARCHAR(64) DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.schema_migrations (version, name, checksum, execution_time_ms, status)
    VALUES (p_version, p_name, p_checksum, p_execution_time_ms, 'success')
    ON CONFLICT (version) DO UPDATE
    SET applied_at = NOW(),
        applied_by = current_user;
    
    RAISE NOTICE 'Migration % registered successfully', p_version;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se migration já foi aplicada
CREATE OR REPLACE FUNCTION public.is_migration_applied(p_version VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schema_migrations 
        WHERE version = p_version AND status = 'success'
    );
END;
$$ LANGUAGE plpgsql;

-- Função para obter última migration aplicada
CREATE OR REPLACE FUNCTION public.get_latest_migration()
RETURNS TABLE(version VARCHAR(255), name VARCHAR(500), applied_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY
    SELECT sm.version, sm.name, sm.applied_at
    FROM public.schema_migrations sm
    WHERE sm.status = 'success'
    ORDER BY sm.applied_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- View para histórico de migrations
CREATE OR REPLACE VIEW public.migration_history AS
SELECT 
    version,
    name,
    applied_at,
    applied_by,
    status,
    execution_time_ms,
    CASE 
        WHEN execution_time_ms < 1000 THEN 'Fast'
        WHEN execution_time_ms < 5000 THEN 'Normal'
        ELSE 'Slow'
    END as performance_category
FROM public.schema_migrations
ORDER BY applied_at DESC;

-- Grants para admin
GRANT SELECT ON public.schema_migrations TO authenticated;
GRANT ALL ON public.schema_migrations TO postgres;
GRANT EXECUTE ON FUNCTION public.register_migration TO postgres;
GRANT EXECUTE ON FUNCTION public.is_migration_applied TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_migration TO authenticated;

-- Inserir registro inicial
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '001_initial_schema') THEN
        PERFORM public.register_migration(
            '001_initial_schema',
            'Schema inicial do Ifarma',
            NULL,
            NULL
        );
    END IF;
END $$;

-- Log
SELECT 'Migration tracking system installed successfully' AS message;
SELECT * FROM public.get_latest_migration();
