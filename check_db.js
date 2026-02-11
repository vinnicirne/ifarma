
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnostic() {
    console.log('--- DIAGNÓSTICO DE DADOS ---');

    const { count: pharmacyCount, error: pError } = await supabase
        .from('pharmacies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

    if (pError) console.error('Erro Farmácias:', pError.message);
    else console.log('Farmácias Aprovadas:', pharmacyCount);

    const { count: feedCount, error: fError } = await supabase
        .from('app_feed_sections')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    if (fError) console.error('Erro Feed:', fError.message);
    else console.log('Seções de Feed Ativas:', feedCount);

    const { data: categories, error: cError } = await supabase
        .from('app_feed_sections')
        .select('type, title');

    if (cError) console.error('Erro Categorias Feed:', cError.message);
    else console.log('Tipos de seções encontradas:', categories.map(c => c.type));
}

diagnostic();
