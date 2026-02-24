
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function checkCNPJs() {
    const { data: pharmacies, error } = await supabase
        .from('pharmacies')
        .select('id, name, cnpj')
        .order('updated_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching pharmacies:', error);
        return;
    }

    console.log('--- Last 10 Pharmacies ---');
    pharmacies.forEach(p => {
        const raw = String(p.cnpj || '').replace(/\D/g, '');
        console.log(`ID: ${p.id} | Name: ${p.name} | CNPJ: ${p.cnpj} | Clean: ${raw} | Length: ${raw.length}`);
    });
}

checkCNPJs();
