import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MaterialIcon } from '../Shared';
import { useCartCount } from '../../hooks/useCartCount';
import { useNotifications } from '../../hooks/useNotifications';
import { supabase } from '../../lib/supabase';

export const BottomNav = ({ session }: { session: any }) => {
    const location = useLocation();
    const currentPath = location.pathname;
    const userId = session?.user?.id;
    const [hasAdMob, setHasAdMob] = useState(false);

    const cartCount = useCartCount(userId);
    const { unreadCount } = useNotifications(userId);

    useEffect(() => {
        const checkAdMobPosition = async () => {
            const { data } = await supabase
                .from('app_feed_sections')
                .select('position, is_active')
                .eq('type', 'admob.banner')
                .single();

            // Se existir, estiver ativo, e a posição NÃO for 0 (0 = Topo), então Menu sobe
            if (data && data.is_active && data.position > 0) {
                setHasAdMob(true);
            } else {
                setHasAdMob(false);
            }
        };

        checkAdMobPosition();

        // Realtime Subscription para Feed Updates
        const channel = supabase.channel('feed-bottom-nav')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'app_feed_sections' },
                () => {
                    checkAdMobPosition();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const navItems = [
        { path: '/', label: 'Início', icon: 'home' },
        { path: '/pharmacies', label: 'Explorar', icon: 'explore' },
        { path: '/cart', label: 'Carrinho', icon: 'shopping_cart', count: cartCount },
        { path: '/meus-pedidos', label: 'Pedidos', icon: 'receipt_long' },
        { path: '/profile', label: 'Perfil', icon: 'person', count: unreadCount, badgeColor: 'bg-primary' },
    ];

    return (
        <div className={`fixed transition-all duration-300 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-50 ${hasAdMob ? 'bottom-[100px]' : 'bottom-6'}`}>
            <nav className="bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-[32px] px-6 py-3 flex items-center justify-between shadow-2xl border border-white/10 ring-1 ring-white/5">
                {navItems.map((item) => {
                    const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center relative transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {item.count !== undefined && item.count > 0 && (
                                <div className={`absolute -top-1.5 -right-1.5 ${item.badgeColor || 'bg-primary'} size-4 rounded-full flex items-center justify-center border-2 border-zinc-900 animate-in zoom-in duration-300`}>
                                    <span className="text-[8px] text-black font-black">{item.count}</span>
                                </div>
                            )}
                            <MaterialIcon name={item.icon} fill={isActive} />
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-1 scale-75 origin-top">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};
