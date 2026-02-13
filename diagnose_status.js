
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStatus() {
    console.log('--- DIAGNOSTIC: PHARMACY STATUS ---');

    // Check for 'approved' (Old)
    const { count: countLowerCase, error: errLower } = await supabase
        .from('pharmacies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

    // Check for 'Aprovado' (New Standard)
    const { count: countCapitalized, error: errCap } = await supabase
        .from('pharmacies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Aprovado');

    // Check for ANY status
    const { data: allPharmacies, error: errAll } = await supabase
        .from('pharmacies')
        .select('id, name, status, is_featured, plan')
        .limit(10);

    console.log(`Lojas com status 'approved': ${countLowerCase}`);
    console.log(`Lojas com status 'Aprovado': ${countCapitalized}`);

    if (errLower) console.error('Erro query approved:', errLower.message);
    if (errCap) console.error('Erro query Aprovado:', errCap.message);

    console.log('\n--- SAMPLE DATA ---');
    console.table(allPharmacies);
}

checkStatus();
