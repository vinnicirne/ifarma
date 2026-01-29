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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('Usuário não autenticado');
        }

        const { error } = await supabase
            .from('cart_items')
            .upsert({
                customer_id: session.user.id,
                product_id: productId,
                pharmacy_id: pharmacyId,
                quantity
            });

        if (error) throw error;
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
