
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkInvoices() {
    const pharmacyId = '8f98f6b8-a82b-478c-9f8b-da8ebdb39b3d';
    console.log('Checking invoices for pharmacy:', pharmacyId);

    const { data: invoices, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('pharmacy_id', pharmacyId);

    if (error) {
        console.error('Error fetching invoices:', error);

        // Try with uppercase if lowercase fails (to check if migration was run)
        const { data: inv2, error: err2 } = await supabase
            .from('billing_invoices')
            .select('*')
            .eq('Pharmacy_id', pharmacyId);

        if (inv2) {
            console.log('Invoices found with "Pharmacy_id":', inv2);
        } else {
            console.error('Error fetching with Pharmacy_id:', err2);
        }
    } else {
        console.log('Invoices found:', invoices);
    }
}

checkInvoices();
