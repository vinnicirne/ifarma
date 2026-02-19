
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("\n--- PHARMACIES ---");
    const { data: pharmacies } = await supabase.from('pharmacies').select('id, name, status, plan');
    console.log(JSON.stringify(pharmacies, null, 2));

    console.log("\n--- ADS ---");
    const { data: ads } = await supabase.from('ads_campaigns').select('*');
    console.log(JSON.stringify(ads, null, 2));
}

check();
