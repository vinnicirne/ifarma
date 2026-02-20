import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SQL_FIX = `
-- ============================================
-- CORREÇÃO CRÍTICA: POLÍTICAS RLS PARA device_tokens
-- ============================================

DROP POLICY IF EXISTS "Usuários podem registrar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Usuários podem atualizar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Usuários podem deletar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Leitura de tokens" ON device_tokens;

CREATE POLICY "Usuários podem registrar tokens" ON device_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar tokens" ON device_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar tokens" ON device_tokens
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Leitura de tokens" ON device_tokens
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.jwt() ->> 'role' = 'service_role'
    );
`;

async function applyFix() {
    console.log('🔧 Aplicando correção de RLS para device_tokens...\n');
    
    try {
        // Nota: A API REST do Supabase não permite executar SQL diretamente
        // Você precisa executar via Dashboard ou CLI
        console.log('⚠️  ATENÇÃO: Execute o SQL abaixo no Supabase Dashboard → SQL Editor\n');
        console.log('=' .repeat(70));
        console.log(SQL_FIX);
        console.log('=' .repeat(70));
        console.log('\n📋 PASSOS:');
        console.log('1. Abra https://gtjhpkakousmdrzjpdat.supabase.co/project/gtjhpkakousmdrzjpdat/sql');
        console.log('2. Cole o SQL acima');
        console.log('3. Clique em "RUN"');
        console.log('\n✅ Após executar, as notificações push funcionarão!');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

applyFix();
