
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    console.log('URL:', supabaseUrl);
    console.log('KEY:', !!supabaseKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchData() {
    console.log('--- 3 Registros de Billing Plans ---');
    const { data: plans, error: plansError } = await supabase
        .from('billing_plans')
        .select('id, name, slug, is_active')
        .limit(3);

    if (plansError) console.error('Erro fetching plans:', plansError);
    else console.table(plans);

    console.log('\n--- 1 Registro de Pharmacy Recém Criada ---');
    const { data: pharmacy, error: pharmacyError } = await supabase
        .from('pharmacies')
        .select('id, status, cnpj, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    if (pharmacyError) console.error('Erro fetching pharmacy:', pharmacyError);
    else if (pharmacy && pharmacy.length > 0) console.table(pharmacy);
    else console.log('Nenhuma farmácia encontrada.');

    console.log('\n--- 1 Registro de Pharmacy Subscription ---');
    const { data: subscription, error: subError } = await supabase
        .from('pharmacy_subscriptions')
        .select('pharmacy_id, plan_id, status, next_billing_date')
        .limit(1);

    if (subError) console.error('Erro fetching subscription:', subError);
    else if (subscription && subscription.length > 0) console.table(subscription);
    else console.log('Nenhuma assinatura encontrada.');
}

fetchData();
