
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("--- ADS CAMPAIGNS ---");
    const { data: ads } = await supabase.from('ads_campaigns').select('id, title, is_active, region_id');
    console.log(JSON.stringify(ads, null, 2));

    console.log("\n--- PRODUCTS ---");
    const { data: products } = await supabase.from('products').select('id, name, promo_price, image_url, pharmacy_id').limit(10);
    console.log(JSON.stringify(products, null, 2));

    console.log("\n--- FEED SECTIONS ---");
    const { data: sections } = await supabase.from('app_feed_sections').select('id, type, is_active, config');
    console.log(JSON.stringify(sections, null, 2));
}

check();
