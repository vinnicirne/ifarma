
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixFeed() {
    console.log('🔧 Iniciando limpeza e restauração do Feed...');

    // 1. Limpar tudo
    const { error: deleteError } = await supabase
        .from('app_feed_sections')
        .delete()
        .neq('type', 'invalid_fake_type');

    if (deleteError) {
        console.error('❌ Erro ao limpar feed:', deleteError.message);
        return;
    }
    console.log('✅ Feed limpo.');

    // 2. Inserir seções corretas incluindo ads.internal
    const sections = [
        { title: 'Destaques da Semana', type: 'banner.top', position: 1, is_active: true, config: { images: [] } },
        { title: 'Patrocinado', type: 'ads.internal', position: 2, is_active: true, config: {} },
        { title: 'Categorias', type: 'category_grid', position: 3, is_active: true, config: { limit: 12 } },
        { title: 'Farmácias em Destaque', type: 'pharmacy_list.featured', position: 4, is_active: true, config: { limit: 10 } },
        { title: 'Ofertas Especiais', type: 'pharmacy_list.bonus', position: 5, is_active: true, config: { limit: 10 } },
        { title: 'Perto de Você', type: 'pharmacy_list.nearby', position: 6, is_active: true, config: { limit: 10 } },
        { title: 'Publicidade Externa', type: 'admob.banner', position: 7, is_active: true, config: {} },
    ];

    const { error: insertError } = await supabase
        .from('app_feed_sections')
        .insert(sections);

    if (insertError) {
        console.error('❌ Erro ao inserir seções:', insertError.message);
        return;
    }
    console.log('✅ Seções restauradas com sucesso (incluindo Patrocinado).');
}

fixFeed();
