import { supabase } from './supabase';

export const simulatorService = {
    /**
     * Simula um fluxo completo de pedido:
     * 1. Escolhe uma farmácia aleatória aprovada
     * 2. Escolhe 1-3 produtos dessa farmácia
     * 3. Cria um pedido com status 'pendente'
     * 4. Adiciona os itens ao pedido
     */
    simulateCompleteOrder: async () => {
        try {
            // 1. Buscar farmácias aprovadas
            const { data: pharmacies, error: pharmaError } = await supabase
                .from('pharmacies')
                .select('id, name')
                .eq('status', 'Aprovado')
                .limit(10);

            if (pharmaError || !pharmacies || pharmacies.length === 0) {
                throw new Error('Nenhuma farmácia aprovada encontrada para simulação.');
            }

            const randomPharma = pharmacies[Math.floor(Math.random() * pharmacies.length)];

            // 2. Buscar produtos da farmácia (ou globais se não houver específicos)
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('*')
                .limit(20);

            if (prodError || !products || products.length === 0) {
                throw new Error('Nenhum produto encontrado para simulação.');
            }

            // Escolher 1 a 3 itens aleatórios
            const numItems = Math.floor(Math.random() * 3) + 1;
            const selectedProducts = products
                .sort(() => 0.5 - Math.random())
                .slice(0, numItems);

            const customers = ['Ana Silva', 'Pedro Oliveira', 'Mariana Costa', 'Juliana Lima', 'Rodrigo Santos'];
            const randomCustomer = customers[Math.floor(Math.random() * customers.length)];

            const subtotal = selectedProducts.reduce((acc, p) => acc + (Math.random() * 50 + 10), 0);
            const deliveryFee = 0; // Grátis na simulação

            // 3. Criar o pedido - FIXED: Added customer_id (required by schema)
            const { data: { session } } = await supabase.auth.getSession();
            const customerId = session?.user?.id;

            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    pharmacy_id: randomPharma.id,
                    customer_id: customerId, // Associar ao usuário logado ou um fixo
                    customer_name: randomCustomer,
                    address: 'Rua das Flores, 123 - Centro, Rio de Janeiro',
                    total_price: subtotal + deliveryFee,
                    status: 'pendente',
                    payment_method: 'Dinheiro', // Added to satisfy schema
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 4. Criar Itens do Pedido
            const orderItems = selectedProducts.map(p => ({
                order_id: newOrder.id,
                product_id: p.id,
                quantity: Math.floor(Math.random() * 2) + 1,
                price: (Math.random() * 50 + 10).toFixed(2)
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            return {
                success: true,
                orderId: newOrder.id,
                customer: randomCustomer,
                pharmacy: randomPharma.name,
                total: (subtotal + deliveryFee).toFixed(2)
            };
        } catch (error: any) {
            console.error('Erro na simulação de pedido:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Avança o status de um pedido específico
     */
    advanceOrderStatus: async (orderId: string) => {
        // Fluxo Completo Real
        const statusFlow = ['pendente', 'preparando', 'aguardando_motoboy', 'pronto_entrega', 'em_rota', 'entregue'];

        try {
            const { data: order, error: fetchError } = await supabase
                .from('orders')
                .select('status, pharmacy_id, motoboy_id')
                .eq('id', orderId)
                .single();

            if (fetchError || !order) throw new Error('Pedido não encontrado.');

            const currentIndex = statusFlow.indexOf(order.status);
            if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
                return { success: false, message: 'Pedido já está no status final ou status inválido.' };
            }

            const nextStatus = statusFlow[currentIndex + 1];
            const updates: any = { status: nextStatus };

            // Lógica Especial: Atribuição Automática de Motoboy
            if (nextStatus === 'pronto_entrega' || nextStatus === 'em_rota') {
                if (!order.motoboy_id) {
                    // Tentar achar um motoboy disponível para atribuir
                    const { data: drivers } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('role', 'motoboy')
                        .limit(1);

                    if (drivers && drivers.length > 0) {
                        updates.motoboy_id = drivers[0].id;
                        // Também atualiza o perfil do motoboy para refletir o pedido atual
                        await supabase.from('profiles').update({ current_order_id: orderId }).eq('id', drivers[0].id);
                    }
                }
            }

            // Lógica Especial: Telemetria de Chegada e Entrega
            if (nextStatus === 'entregue') {
                updates.delivered_at = new Date().toISOString();
                // Limpar motoboy
                if (order.motoboy_id) {
                    await supabase.from('profiles').update({ current_order_id: null }).eq('id', order.motoboy_id);
                }
            }

            const { error: updateError } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', orderId);

            if (updateError) throw updateError;

            return { success: true, newStatus: nextStatus };
        } catch (error: any) {
            console.error('Erro ao avançar status:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Simula o registro de uma nova farmácia parceira
     */
    simulateNewPharmacyRegistration: async () => {
        const names = ['Droga Life', 'Pharma Rio', 'Medic Center', 'Saúde & Bem-Estar', 'Farmácia do Povo'];
        const randomName = names[Math.floor(Math.random() * names.length)];

        try {
            const { data, error } = await supabase
                .from('pharmacies')
                .insert([{
                    name: randomName + ' (Simulado)',
                    address: 'Av. Brasil, 500 - Rio de Janeiro, RJ',
                    latitude: -22.9068 + (Math.random() - 0.5) * 0.1,
                    longitude: -43.1729 + (Math.random() - 0.5) * 0.1,
                    status: 'Pendente',
                    plan: 'Bronze',
                    rating: 5.0,
                    is_open: true,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, pharmacy: data };
        } catch (error: any) {
            console.error('Erro ao simular cadastro de farmácia:', error);
            return { success: false, error: error.message };
        }
    }
};
