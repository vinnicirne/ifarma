
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSchema() {
    console.log('Fetching schema for billing_invoices...');

    // Use a query that will definitely fail if the table exists but we want names
    const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'billing_invoices' });

    if (error) {
        // If RPC doesn't exist, use another trick: select 0 rows and check keys
        const { data: row, error: rowError } = await supabase
            .from('billing_invoices')
            .select('*')
            .limit(1);

        if (rowError) {
            console.error('Error fetching rows:', rowError);
            return;
        }

        if (row && row.length > 0) {
            console.log('Columns found in first row:', Object.keys(row[0]));
        } else {
            // Fallback to a query that gives us some info
            const { data: info, error: infoError } = await supabase.from('billing_invoices').select('*').limit(0);
            console.log('Empty select keys:', Object.keys(info?.[0] || {}));
            // Since it's empty, we might need a better way. 
            // Let's try to query information_schema directly if permissions allow (unlikely via anon key).
        }
    } else {
        console.log('Columns from RPC:', data);
    }
}

checkSchema();
