import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MaterialIcon } from '../Shared';
import { supabase } from '../../lib/supabase';

import { useCartCount } from '../../hooks/useCartCount';

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
