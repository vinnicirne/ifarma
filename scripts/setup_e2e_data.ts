import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load .env and .env.local (for service role key)
dotenv.config();
if (fs.existsSync('.env.local')) dotenv.config({ path: '.env.local', override: true });
if (fs.existsSync('.env.test')) dotenv.config({ path: '.env.test', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
// Service role bypasses RLS - needed for seed operations
const SERVICE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.IFARMA_SERVICE_ROLE_KEY ||
    ANON_KEY; // Fallback to anon - operations will respect RLS

// Admin client - bypasses RLS for seed operations
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Regular client - uses RLS (for auth operations)
const supabase = createClient(SUPABASE_URL, ANON_KEY);

const LAT = -22.8552002;
const LNG = -43.0273776;


async function getOrCreateUser(email: string, role: string): Promise<string> {
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'password123'
    });

    if (error) {
        console.log(`Criando usuário ${email}...`);
        const { data: signUpData, error: signError } = await supabase.auth.signUp({
            email,
            password: 'password123',
            options: { data: { full_name: role.toUpperCase(), role: role } }
        });
        if (signError) throw signError;
        return signUpData.user!.id;
    }
    return signInData.user.id;
}

async function setup() {
    console.log('🚀 Iniciando setup ROBUSTO de dados para E2E...');
    console.log(`🔑 Service role: ${SERVICE_KEY !== ANON_KEY ? 'disponível (bypass RLS)' : 'usando anon key (RLS ativo)'}`);

    // 1. Authenticate as GESTOR
    console.log('🔑 Logando como Gestor...');
    const gestorId = await getOrCreateUser('test-gestor@ifarma.com', 'merchant');

    // 2. Ensure Gestor has a Pharmacy (use admin client for guaranteed access)
    console.log('🏥 Verificando farmácia do Gestor...');
    let { data: pharmacy } = await adminClient
        .from('pharmacies')
        .select('*')
        .eq('owner_id', gestorId)
        .single();

    if (!pharmacy) {
        console.log('Criando nova farmácia para o Gestor...');
        const { data: newPharm, error: createPharmError } = await adminClient
            .from('pharmacies')
            .insert({
                owner_id: gestorId,
                name: 'Farmácia Teste E2E',
                cnpj: '00000000000100',
                address: 'Rua de Teste, 123',
                latitude: LAT,
                longitude: LNG,
                delivery_max_km: 100,
                is_open: true,
                status: 'approved',
                delivery_fee_type: 'fixed',
                delivery_fee_fixed: 5.00
            })
            .select()
            .single();

        if (createPharmError) throw new Error(`Erro ao criar farmácia: ${createPharmError.message}`);
        pharmacy = newPharm;
    } else {
        await adminClient.from('pharmacies').update({
            status: 'approved',
            is_open: true,
            delivery_max_km: 100
        }).eq('id', pharmacy.id);
    }

    console.log(`✅ Farmácia garantida: ${pharmacy!.name} (${pharmacy!.id})`);

    // Cleanup old orders - cancel all non-final orders for this pharmacy AND all motoboy orders
    // Use regular supabase client (logged as gestor) which has merchant RLS access
    console.log('🧹 Limpando pedidos antigos da farmácia...');
    await supabase.from('orders')
        .update({ status: 'cancelado', cancellation_reason: 'E2E Cleanup' })
        .eq('pharmacy_id', pharmacy!.id)
        .not('status', 'in', '("cancelado","entregue")');

    // Also cancel via admin as fallback
    await adminClient.from('orders')
        .update({ status: 'cancelado', cancellation_reason: 'E2E Cleanup' })
        .eq('pharmacy_id', pharmacy!.id)
        .not('status', 'in', '("cancelado","entregue")');

    // 2b. Ensure Payment Settings exist
    const { data: paySettings } = await adminClient.from('pharmacy_payment_settings').select('*').eq('pharmacy_id', pharmacy!.id).single();
    if (!paySettings) {
        await adminClient.from('pharmacy_payment_settings').insert({
            pharmacy_id: pharmacy!.id,
            accepts_cash: true,
            accepts_pix: true,
            accepts_debit: true,
            accepts_credit: true
        });
        console.log('✅ Configurações de pagamento criadas.');
    }

    // 2c. Update Gestor Profile
    await adminClient.from('profiles').update({
        pharmacy_id: pharmacy!.id,
        role: 'merchant'
    }).eq('id', gestorId);

    // 3. Ensure Product exists
    console.log('💊 Verificando produto...');
    let { data: product } = await adminClient
        .from('products')
        .select('*')
        .eq('pharmacy_id', pharmacy!.id)
        .ilike('name', 'Dipirona Teste')
        .maybeSingle();

    if (!product) {
        const { data: newProd, error: prodError } = await adminClient
            .from('products')
            .insert({
                pharmacy_id: pharmacy!.id,
                name: 'Dipirona Teste',
                description: 'Medicamento para teste E2E',
                price: 15.00,
                stock: 100,
                is_active: true,
                requires_prescription: false
            })
            .select()
            .single();

        if (prodError) throw new Error(`Erro ao criar produto: ${prodError.message}`);
        product = newProd;
    }
    console.log(`✅ Produto garantido: ${product!.name} (${product!.id})`);

    // 4. Setup Motoboy
    console.log('🛵 Configurando Motoboy...');
    await supabase.auth.signOut();
    const motoboyId = await getOrCreateUser('test-motoboy@ifarma.com', 'motoboy');

    // Cancel ALL non-final orders for motoboy (no status filter - catch all zombies)
    try {
        const { data: activeOrders } = await adminClient.from('orders')
            .select('id, status')
            .eq('motoboy_id', motoboyId)
            .not('status', 'in', '("cancelado","entregue")');

        if (activeOrders && activeOrders.length > 0) {
            console.log(`🚫 Cancelando ${activeOrders.length} pedidos zumbis do motoboy (${activeOrders.map(o => o.status).join(', ')})...`);
            await adminClient.from('orders')
                .update({ status: 'cancelado', cancellation_reason: 'E2E Cleanup' })
                .in('id', activeOrders.map(o => o.id));
        } else {
            console.log('✅ Nenhum pedido zumbi do motoboy.');
        }
    } catch (e) {
        console.warn('⚠️ Falha ao limpar pedidos do motoboy:', e);
    }

    // Update motoboy profile via admin client
    await adminClient.from('profiles').update({
        full_name: 'Motoboy Teste',
        role: 'motoboy',
        pharmacy_id: pharmacy!.id,
        is_online: true,
        is_active: true,
        current_order_id: null
    }).eq('id', motoboyId);
    console.log('✅ Perfil do Motoboy atualizado (Online/Active).');

    // 5. Client & Cart - use admin client to bypass RLS for cart seed
    console.log('🛒 Configurando Cliente e Carrinho...');
    await supabase.auth.signOut();
    const clientId = await getOrCreateUser('test-cliente@ifarma.com', 'customer');

    // Cancel active client orders
    console.log('🧹 Limpando pedidos antigos do Cliente...');
    try {
        const { data: activeOrders } = await adminClient.from('orders')
            .select('id')
            .eq('customer_id', clientId)
            .neq('status', 'cancelado')
            .neq('status', 'entregue');

        if (activeOrders && activeOrders.length > 0) {
            console.log(`🚫 Cancelando ${activeOrders.length} pedidos zumbis do cliente...`);
            await adminClient.from('orders')
                .update({ status: 'cancelado', cancellation_reason: 'E2E Cleanup' })
                .in('id', activeOrders.map(o => o.id));
        }
    } catch (e) {
        console.warn('⚠️ Falha ao limpar pedidos do cliente:', e);
    }

    // Update client profile with address (needed for "Principal" address chip in checkout)
    await adminClient.from('profiles').update({
        full_name: 'Cliente Teste E2E',
        address: 'Rua do Cliente, 999',
        latitude: LAT + 0.001,
        longitude: LNG + 0.001,
        role: 'customer'
    }).eq('id', clientId);

    // Clear and fill cart using ADMIN client (service role bypasses RLS)
    // Use upsert to avoid unique constraint violations if item already exists
    await adminClient.from('cart_items').delete().eq('customer_id', clientId);

    if (SERVICE_KEY !== ANON_KEY) {
        // Admin can delete/insert freely
        const { error: cartError } = await adminClient.from('cart_items').upsert(
            { customer_id: clientId, product_id: product!.id, pharmacy_id: pharmacy!.id, quantity: 2 },
            { onConflict: 'customer_id,product_id' }
        );
        if (cartError) throw new Error(`Erro ao encher carrinho (admin): ${cartError.message}`);
    } else {
        // Fallback: use regular client (logged as cliente) with upsert
        await supabase.from('cart_items').delete().eq('customer_id', clientId);
        const { error: cartError } = await supabase.from('cart_items').upsert(
            { customer_id: clientId, product_id: product!.id, pharmacy_id: pharmacy!.id, quantity: 2 },
            { onConflict: 'customer_id,product_id' }
        );
        if (cartError) throw new Error(`Erro ao encher carrinho (fallback): ${cartError.message}`);
    }

    console.log(`✅ Carrinho preenchido com 2x ${product!.name}`);
    console.log('✨ Setup Completo e Robusto Finalizado!');
    console.log('\n📋 RESUMO:');
    console.log(`   Gestor: test-gestor@ifarma.com / password123`);
    console.log(`   Motoboy: test-motoboy@ifarma.com / password123`);
    console.log(`   Cliente: test-cliente@ifarma.com / password123`);
    console.log(`   Farmácia: ${pharmacy!.name} (${pharmacy!.id})`);
    console.log(`   Produto: ${product!.name} (${product!.id})`);
}

setup().catch(console.error);
