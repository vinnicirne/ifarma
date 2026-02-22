
import React from 'react';
import { NavLink } from 'react-router-dom';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const ClientSidebar = () => {
    const navItems = [
        { path: '/', label: 'Início', icon: 'home' },
        { path: '/pharmacies', label: 'Buscar', icon: 'search' },
        { path: '/notifications', label: 'Alertas', icon: 'notifications' },
        { path: '/cart', label: 'Carrinho', icon: 'shopping_cart' },
        { path: '/profile', label: 'Perfil', icon: 'person' },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-white/5 z-40 p-6">
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                    <MaterialIcon name="local_pharmacy" className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">ifarma</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cliente</span>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center gap-4 px-4 py-3 rounded-xl transition-all group
                            ${isActive
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}
                        `}
                    >
                        <MaterialIcon name={item.icon} className="text-xl" />
                        <span className="text-sm font-medium">{item.label}</span>
                    </NavLink>
                ))}
                <NavLink
                    to="/about"
                    className={({ isActive }) => `
                        flex items-center gap-4 px-4 py-3 rounded-xl transition-all group
                        ${isActive
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}
                    `}
                >
                    <MaterialIcon name="info" className="text-xl" />
                    <span className="text-sm font-medium">Sobre Nós</span>
                </NavLink>
                <NavLink
                    to="/privacy"
                    className={({ isActive }) => `
                        flex items-center gap-4 px-4 py-3 rounded-xl transition-all group
                        ${isActive
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}
                    `}
                >
                    <MaterialIcon name="shield_lock" className="text-xl" />
                    <span className="text-sm font-medium">Privacidade</span>
                </NavLink>
            </nav>

            <div className="border-t border-slate-100 dark:border-white/5 pt-6 mt-auto">
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Precisa de ajuda?</p>
                    <NavLink to="/help" className="text-primary text-sm font-bold hover:underline">Fale Conosco</NavLink>
                </div>
            </div>
        </aside>
    );
};
