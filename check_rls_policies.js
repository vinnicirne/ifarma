
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPolicies() {
    console.log('--- CHECKING RLS POLICIES ---');

    // Check if we can select pharmacies as ANON
    const { data: anonData, error: anonError } = await supabase
        .from('pharmacies')
        .select('id, name')
        .limit(1);

    if (anonError) console.error('ANON Read Error:', anonError);
    else console.log('ANON Read Success:', anonData.length > 0 ? 'Data found' : 'No data');

    // To check actual policies, we need to query pg_policies via RPC or if we have admin access.
    // Since we don't have admin access easily, we will infer from behavior.

    // If we have a user token, we could test as authenticated user.
    // I can't easily get a valid user token without logging in.

    // Instead, I will query metadata if possible (not possible with anon key usually).

    // Let's check `check_db.js` output again. It worked.

    // I will try to check `app_feed_sections` as well.
    const { data: feedData, error: feedError } = await supabase
        .from('app_feed_sections')
        .select('*')
        .limit(1);

    if (feedError) console.error('Feed Read Error:', feedError);
    else console.log('Feed Read Success:', feedData.length > 0 ? 'Data found' : 'No data');

}

checkPolicies();
