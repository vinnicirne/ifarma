
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Debug: Print cwd and env file path
console.log('CWD:', process.cwd());
const envPath = path.resolve(process.cwd(), '.env');
console.log('Env Path:', envPath);

if (fs.existsSync(envPath)) {
    console.log('.env file found');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.log('.env file NOT found');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Try multiple keys
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key defined:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('\n--- Checking Subscription for Pharmacy 4f665c79-2b05-44cd-a620-9cbbfc3c992f ---');
    const { data: sub, error: subError } = await supabase
        .from('pharmacy_subscriptions')
        .select('*')
        .eq('pharmacy_id', '4f665c79-2b05-44cd-a620-9cbbfc3c992f');

    if (subError) console.error('Error:', subError);
    else {
        console.log('Subscription records found:', sub.length);
        console.table(sub);
    }
}

verify();
