import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuração Supabase:');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ ERRO: Variáveis de ambiente do Supabase não encontradas!');
    console.error('Verifique se o arquivo .env existe e se o servidor foi reiniciado.');
} else {
    console.log('✅ Variáveis de ambiente carregadas com sucesso');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

console.log('✅ Cliente Supabase criado');
