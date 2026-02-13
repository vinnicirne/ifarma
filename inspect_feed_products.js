
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectData() {
    console.log('--- INSPECTING FEED SECTIONS ---');
    const { data: feedData, error: feedError } = await supabase
        .from('app_feed_sections')
        .select('*')
        .eq('is_active', true)
        .order('position');

    if (feedError) console.error('Feed Error:', feedError.message);
    else console.table(feedData.map(f => ({ id: f.id, type: f.type, title: f.title, subtitle: f.subtitle })));

    console.log('\n--- INSPECTING PRODUCTS ---');
    const { count: productCount, error: prodError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    if (prodError) console.error('Product Error:', prodError.message);
    else console.log(`Total Products in DB: ${productCount}`);

    console.log('\n--- SAMPLE PRODUCTS WITH PHARMACY STATUS ---');
    const { data: products, error: prodDataError } = await supabase
        .from('products')
        .select(`
            id, 
            name, 
            price, 
            pharmacies!inner(name, status)
        `)
        .limit(5);

    if (prodDataError) console.error('Product Data Error:', prodDataError.message);
    else console.table(products);
}

inspectData();
