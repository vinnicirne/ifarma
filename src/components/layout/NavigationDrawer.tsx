import React, { useEffect, useState } from 'react';
import { MaterialIcon } from '../Shared';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface NavigationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    session: any;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ isOpen, onClose, session }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        if (session?.user?.id) {
            supabase.from('profiles').select('*').eq('id', session.user.id).single()
                .then(({ data }) => setUserProfile(data));
        }

        // Lock body scroll when open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [session, isOpen]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex font-display">
            {/* Backdrop Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Sidebar Content */}
            <div className="relative flex flex-col w-[85vw] max-w-[320px] h-screen bg-white dark:bg-[#101a22] shadow-2xl animate-slide-in-left transform transition-transform duration-300 ease-out z-10 border-r border-gray-100 dark:border-white/5 overflow-hidden">

                {/* Header: User Profile + Close Button */}
                <div className="flex items-center justify-between p-6 pt-12 border-b border-gray-100 dark:border-white/5 shrink-0 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full p-0.5 border-2 border-primary/30 relative shadow-sm shrink-0">
                            {userProfile?.avatar_url ? (
                                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <div className="w-full h-full bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-400">
                                    <MaterialIcon name="person" className="text-3xl" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight truncate">
                                Olá, {userProfile?.full_name?.split(' ')[0] || 'Visitante'}
                            </h2>
                            <Link
                                to="/profile"
                                onClick={onClose}
                                className="text-primary font-bold text-xs hover:underline mt-0.5 flex items-center gap-1 active:opacity-70 transition-opacity"
                            >
                                Ver Perfil <MaterialIcon name="chevron_right" className="text-sm" />
                            </Link>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm ml-2"
                    >
                        <MaterialIcon name="close" className="text-lg" />
                    </button>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 flex flex-col px-4 py-6 gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <MenuLink icon="home" label="Início" to="/" onClick={onClose} active={location.pathname === '/'} />
                    <MenuLink icon="shopping_cart" label="Carrinho" to="/cart" onClick={onClose} active={location.pathname === '/cart'} />
                    <MenuLink icon="receipt_long" label="Pedidos" to="/meus-pedidos" onClick={onClose} active={location.pathname === '/meus-pedidos'} />
                    <MenuLink icon="favorite" label="Favoritos" to="/favorites" onClick={onClose} active={location.pathname === '/favorites'} />
                    <MenuLink icon="explore" label="Explorar" to="/pharmacies" onClick={onClose} active={location.pathname === '/pharmacies'} />

                    <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                        <MenuLinkSmall icon="help" label="Ajuda" to="/help" onClick={onClose} />
                        <MenuLinkSmall icon="settings" label="Configurar" to="/settings" onClick={onClose} />
                    </div>
                </nav>

                {/* Footer: Sign Out / Login */}
                <div className="p-4 pb-8 border-t border-gray-100 dark:border-white/5 shrink-0 bg-gray-50 dark:bg-black/20">
                    {session ? (
                        <button
                            onClick={handleSignOut}
                            className="w-full py-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-base flex items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-red-100 dark:hover:bg-red-500/20"
                        >
                            <MaterialIcon name="logout" className="text-xl" />
                            Sair da Conta
                        </button>
                    ) : (
                        <Link
                            to="/login"
                            onClick={onClose}
                            className="w-full py-3.5 rounded-xl bg-primary text-[#0d161b] font-bold text-base flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg shadow-primary/20 hover:brightness-110"
                        >
                            <MaterialIcon name="login" className="text-xl" />
                            Acessar Conta
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

// Componente de Link (Grande)
const MenuLink = ({ icon, label, to, onClick, active }: any) => (
    <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-4 p-3 rounded-xl transition-all ${active
            ? 'bg-primary text-[#0d161b] shadow-md shadow-primary/10 font-black scale-[1.01]'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-[0.98]'
            }`}
    >
        <MaterialIcon name={icon} className={`text-2xl ${active ? 'opacity-100' : 'opacity-70'}`} />
        <span className="text-base font-bold tracking-tight">{label}</span>
        {active && <MaterialIcon name="chevron_right" className="ml-auto opacity-50 text-xl" />}
    </Link>
);

// Componente de Link Pequeno (Grid)
const MenuLinkSmall = ({ icon, label, to, onClick }: any) => (
    <Link
        to={to}
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-white/10 transition-colors active:scale-95"
    >
        <MaterialIcon name={icon} className="text-xl mb-0.5" />
        {label}
    </Link>
);
