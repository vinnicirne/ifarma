
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtjhpkakousmdrzjpdat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0amhwa2Frb3VzbWRyempwZGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzQ4ODIsImV4cCI6MjA4NjI1MDg4Mn0.oE4YiToAHM3uHLhDcx0sKBHke1Q75OpuAaAolUUZEIw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
    console.log('--- CHECK PHARMACY PLAN ---');

    const { data, error } = await supabase
        .from('pharmacies')
        .select('id, name, plan, is_featured')
        .eq('status', 'approved');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Pharmacies:', data);

    const nullPlans = data.filter(p => !p.plan);
    if (nullPlans.length > 0) {
        console.error('❌ FOUND PHARMACIES WITH NULL PLAN:', nullPlans.length);
        console.log(nullPlans);
    } else {
        console.log('✅ All pharmacies have a plan.');
    }
}

checkData();
