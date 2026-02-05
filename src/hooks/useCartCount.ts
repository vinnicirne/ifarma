import React from 'react';
import { supabase } from '../lib/supabase';

export const useCartCount = (userId: string | undefined) => {
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
        if (!userId) {
            setCount(0);
            return;
        }

        const fetchCount = async () => {
            try {
                const { count: c, error } = await supabase
                    .from('cart_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('customer_id', userId);

                if (!error) setCount(c || 0);
            } catch (err) {
                console.error("Error fetching cart count:", err);
            }
        };

        fetchCount();

        // Subscribe to changes
        const channel = supabase
            .channel(`cart_counter_${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'cart_items',
                filter: `customer_id=eq.${userId}`
            }, () => {
                fetchCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return count;
};
