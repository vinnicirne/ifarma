import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MaterialIcon } from '../Shared';
import { supabase } from '../../lib/supabase';

// Helper hook for cart count (could be moved to a context later)
export const useCartCount = (userId: string | undefined) => {
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
        if (!userId) return;

        const fetchCount = async () => {
            const { count } = await supabase
                .from('cart_items')
                .select('*', { count: 'exact', head: true })
                .eq('customer_id', userId);
            setCount(count || 0);
        };

        fetchCount();

        // Subscribe to changes
        const channel = supabase
            .channel('cart_counter')
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

export const BottomNav = ({ session }: { session: any }) => {
    const location = useLocation();
    const cartCount = useCartCount(session?.user?.id);

    return (
        <nav className="fixed bottom-0 w-full max-w-[480px] bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-6 pt-2 z-50">
            <div className="flex justify-around items-center">
                <Link to="/" className={`flex flex-col items-center gap-1 ${location.pathname === '/' ? 'text-primary' : 'text-slate-400'}`}>
                    <MaterialIcon name="home" fill={location.pathname === '/'} />
                    <span className="text-[10px] font-bold">Início</span>
                </Link>
                <Link to="/pharmacies" className={`flex flex-col items-center gap-1 ${location.pathname === '/pharmacies' ? 'text-primary' : 'text-slate-400'}`}>
                    <MaterialIcon name="search" fill={location.pathname === '/pharmacies'} />
                    <span className="text-[10px] font-bold">Busca</span>
                </Link>
                <Link to="/cart" className={`flex flex-col items-center gap-1 relative ${location.pathname === '/cart' ? 'text-primary' : 'text-slate-400'}`}>
                    <MaterialIcon name="shopping_cart" fill={location.pathname === '/cart'} />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black size-4 rounded-full flex items-center justify-center border border-white">
                            {cartCount}
                        </span>
                    )}
                    <span className="text-[10px] font-bold">Carrinho</span>
                </Link>
                <Link to="/profile" className={`flex flex-col items-center gap-1 ${location.pathname === '/profile' ? 'text-primary' : 'text-slate-400'}`}>
                    <MaterialIcon name="person" fill={location.pathname === '/profile'} />
                    <span className="text-[10px] font-bold">Perfil</span>
                </Link>
            </div>
        </nav>
    );
};
