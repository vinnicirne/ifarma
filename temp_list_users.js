import { createClient } from '@supabase/supabase-js';

// Hardcoded keys from .env
const supabaseUrl = 'https://isldwcghygyehuvohxaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGR3Y2doeWd5ZWh1dm9oeGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyNTcsImV4cCI6MjA4NDk2MTI1N30.GQlBYKLBHbaGyuFfo-npL3qgsK381NT5mwV4T7LIU7Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    console.log('Fetching ALL users (limit 50)...');

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, email')
        .limit(50);

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('All Profiles Found:');
        console.table(data);
    }
}

listUsers();
