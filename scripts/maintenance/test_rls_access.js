
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLSPolicies() {
    console.log('--- CHECKING RLS POLICIES ---');

    // Note: We can't see the policies themselves via JS client usually,
    // but we can test access with different "roles" if we had a JWT.
    // However, we can use RPC to check if there's any helper function.

    // For now, let's just try to fetch as Anon (Public)
    const { data, error } = await supabase.from('pharmacies').select('id').limit(1);
    console.log('Anon Access to pharmacies:', error ? `ERROR: ${error.message}` : 'SUCCESS');

    // What about products?
    const { data: prodData, error: prodError } = await supabase.from('products').select('id').limit(1);
    console.log('Anon Access to products:', prodError ? `ERROR: ${prodError.message}` : 'SUCCESS');

    // Feed sections?
    const { data: feedData, error: feedError } = await supabase.from('app_feed_sections').select('id').limit(1);
    console.log('Anon Access to app_feed_sections:', feedError ? `ERROR: ${feedError.message}` : 'SUCCESS');
}

checkRLSPolicies();
