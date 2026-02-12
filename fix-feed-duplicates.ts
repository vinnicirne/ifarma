import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixFeedDuplicates() {
    console.log('🔧 Fixing feed duplicates...\n');

    // 1. Delete all existing sections
    console.log('1️⃣ Deleting all existing feed sections...');
    const { error: deleteError } = await supabase
        .from('app_feed_sections')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
        console.error('❌ Error deleting:', deleteError);
        process.exit(1);
    }
    console.log('✅ All sections deleted\n');

    // 2. Insert correct sections
    console.log('2️⃣ Inserting correct feed sections...');
    const correctSections = [
        { title: 'Destaques da Semana', type: 'banner.top', position: 1, is_active: true, config: { images: [] } },
        { title: 'Publicidade (Google AdMob)', type: 'admob.banner', position: 2, is_active: true, config: {} },
        { title: 'Categorias', type: 'category_grid', position: 3, is_active: true, config: { limit: 10 } },
        { title: 'Ofertas Especiais', type: 'pharmacy_list.bonus', position: 4, is_active: true, config: { limit: 5 } },
        { title: 'Perto de Você', type: 'pharmacy_list.nearby', position: 5, is_active: true, config: { limit: 5 } },
        { title: 'Farmácias em Destaque', type: 'pharmacy_list.featured', position: 6, is_active: true, config: { limit: 5 } },
    ];

    const { data: insertData, error: insertError } = await supabase
        .from('app_feed_sections')
        .insert(correctSections)
        .select();

    if (insertError) {
        console.error('❌ Error inserting:', insertError);
        process.exit(1);
    }
    console.log('✅ Inserted', insertData?.length, 'sections\n');

    // 3. Verify result
    console.log('3️⃣ Verifying result...');
    const { data: verifyData, error: verifyError } = await supabase
        .from('app_feed_sections')
        .select('position, title, type, is_active')
        .order('position');

    if (verifyError) {
        console.error('❌ Error verifying:', verifyError);
        process.exit(1);
    }

    console.log('\n📋 Final Feed Structure:');
    console.table(verifyData);

    console.log('\n✅ Feed duplicates fixed successfully!');
}

fixFeedDuplicates();
