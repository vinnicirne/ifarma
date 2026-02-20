// Teste isolado do Realtime para debug
import { supabase } from './lib/supabase.js';

console.log('🧪 Teste isolado do Realtime');

// Teste 1: Canal simples sem filter
const testChannel = supabase.channel('test-simple')
    .subscribe((status) => {
        console.log('Test status:', status);
        if (status === 'SUBSCRIBED') {
            console.log('✅ Canal simples funcionou!');
            supabase.removeChannel(testChannel);
        }
        if (status === 'CHANNEL_ERROR') {
            console.error('❌ Erro no canal simples');
        }
    });

// Teste 2: Verificar se profiles está habilitado para Realtime
setTimeout(async () => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('❌ Erro ao acessar profiles:', error);
        } else {
            console.log('✅ Profiles acessível via REST');
        }
    } catch (err) {
        console.error('❌ Erro geral:', err);
    }
}, 2000);

// Teste 3: Verificar configuração do Supabase
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurada' : 'FALTANDO');
