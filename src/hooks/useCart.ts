import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useCart = () => {
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchCartItems = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setLoading(true);
        const { data } = await supabase
            .from('cart_items')
            .select('*, products(*, pharmacies(*))')
            .eq('customer_id', session.user.id);

        if (data) {
            setCartItems(data);
            const t = data.reduce((acc, item) => acc + (Number(item.products.price) * item.quantity), 0);
            setTotal(t);
        }
        setLoading(false);
    };

    const addToCart = async (productId: string, pharmacyId: string, quantity: number = 1) => {
        let sessionData = await supabase.auth.getSession();
        let session = sessionData.data.session;

        // Tentar buscar novamente se não houver sessão imediata (comum no Capacitor)
        if (!session) {
            const { data } = await supabase.auth.getSession();
            session = data.session;
        }

        if (!session) {
            throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
        }

        // Check if item already exists in cart
        const { data: existing } = await supabase
            .from('cart_items')
            .select('id, quantity')
            .eq('customer_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle();

        let error;

        if (existing) {
            // Item exists: increment quantity
            ({ error } = await supabase
                .from('cart_items')
                .update({ quantity: existing.quantity + quantity })
                .eq('id', existing.id));
        } else {
            // New item: insert
            ({ error } = await supabase
                .from('cart_items')
                .insert({
                    customer_id: session.user.id,
                    product_id: productId,
                    pharmacy_id: pharmacyId,
                    quantity
                }));
        }

        if (error) {
            if (error.message.includes('schema cache')) {
                throw new Error('Erro de sincronização no servidor. Por favor, tente novamente em instantes.');
            }
            throw error;
        }
        await fetchCartItems();
    };

    const updateQuantity = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) {
            await removeItem(itemId);
            return;
        }

        await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', itemId);

        await fetchCartItems();
    };

    const removeItem = async (itemId: string) => {
        await supabase
            .from('cart_items')
            .delete()
            .eq('id', itemId);

        await fetchCartItems();
    };

    const clearCart = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase
            .from('cart_items')
            .delete()
            .eq('customer_id', session.user.id);

        setCartItems([]);
        setTotal(0);
    };

    useEffect(() => {
        fetchCartItems();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) fetchCartItems();
            else setCartItems([]);
        });

        // Subscribe to changes
        let channel: any;

        const setupSubscription = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            channel = supabase
                .channel(`cart_changes_${session.user.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'cart_items',
                    filter: `customer_id=eq.${session.user.id}`
                }, () => {
                    fetchCartItems();
                })
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    return {
        cartItems,
        total,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        fetchCartItems
    };
};
