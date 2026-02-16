
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSchema() {
    // Try to select the specific column to see if it errors
    const { data, error } = await supabase
        .from('billing_invoices')
        .select('asaas_status')
        .limit(1);

    if (error) {
        console.error('Error selecting asaas_status:', error);
    } else {
        console.log('Column asaas_status exists!');
    }
}

checkSchema();
