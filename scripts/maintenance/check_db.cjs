
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'billing_invoices' });
    if (error) {
        // Fallback: try to just select 1 row and see keys
        const { data: row, error: rowErr } = await supabase.from('billing_invoices').select('*').limit(1).maybeSingle();
        if (rowErr) {
            console.error('Error:', rowErr);
            return;
        }
        console.log('Columns found in row:', Object.keys(row || {}));
    } else {
        console.log('Schema:', data);
    }
}

checkColumns();
