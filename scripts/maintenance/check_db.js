
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking pharmacies table...');
    const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching pharmacy:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Found columns:', Object.keys(data[0]));
        console.log('Sample delivery_time_min:', data[0].delivery_time_min);
        console.log('Sample delivery_time_max:', data[0].delivery_time_max);
    } else {
        console.log('No pharmacies found');
    }
}

checkSchema();
