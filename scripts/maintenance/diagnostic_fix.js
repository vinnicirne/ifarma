
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnostic() {
    console.log('--- DIAGNÓSTICO DE PROBLEMAS ---');

    console.log('\n1. Verificando Tabela cart_items...');
    const { error: cartError } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true });

    if (cartError) {
        console.error('❌ Erro na tabela cart_items:', cartError.message);
        if (cartError.message.includes('not found')) {
            console.log('💡 DICA: A tabela realmente não existe no schema public.');
        }
    } else {
        console.log('✅ Tabela cart_items existe e está acessível.');
    }

    console.log('\n2. Verificando Duplicatas no Feed...');
    const { data: feedSections, error: feedError } = await supabase
        .from('app_feed_sections')
        .select('id, type, title, position, is_active')
        .order('position', { ascending: true });

    if (feedError) {
        console.error('❌ Erro ao buscar feed:', feedError.message);
    } else if (feedSections) {
        console.log(`✅ Encontradas ${feedSections.length} seções no feed.`);
        const counts = {};
        feedSections.forEach(s => {
            counts[s.type] = (counts[s.type] || 0) + 1;
            console.log(`   - [Pos ${s.position}] ${s.type} (${s.title}) ${s.is_active ? '[ATIVO]' : '[INATIVO]'}`);
        });

        const duplicates = Object.keys(counts).filter(type => counts[type] > 1);
        if (duplicates.length > 0) {
            console.warn('⚠️ AVISO: Tipos duplicados encontrados:', duplicates);
        } else {
            console.log('✅ Nenhuma duplicata de tipo encontrada (embora possam existir duplicatas com títulos diferentes).');
        }
    }

    console.log('\n3. Verificando Sessão (Simulado)...');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.warn('⚠️ Nenhuma sessão ativa no momento da execução deste script.');
    } else {
        console.log('✅ Sessão ativa para:', session.user.email);
    }
}

diagnostic();
