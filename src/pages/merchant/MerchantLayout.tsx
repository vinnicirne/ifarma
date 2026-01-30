import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const MerchantLayout = ({ children, activeTab, title }: { children: React.ReactNode, activeTab: string, title?: string }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/gestor/login');
    };

    React.useEffect(() => {
        const updateAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('pharmacy_id')
                    .eq('id', user.id)
                    .single();

                if (profile?.pharmacy_id) {
                    await supabase
                        .from('pharmacies')
                        .update({ last_access: new Date().toISOString() })
                        .eq('id', profile.pharmacy_id);
                }
            }
        };
        updateAccess();
    }, []);

    const navItems = [
        { id: 'dashboard', label: 'Visão Geral', icon: 'dashboard', path: '/gestor' },
        { id: 'orders', label: 'Pedidos', icon: 'receipt_long', path: '/gestor/orders' },
        { id: 'products', label: 'Produtos', icon: 'inventory_2', path: '/gestor/products' },
        { id: 'team', label: 'Equipe / Cargos', icon: 'groups', path: '/gestor/equipe' },
        { id: 'financial', label: 'Financeiro', icon: 'payments', path: '/gestor/financial' },
        { id: 'settings', label: 'Configurações', icon: 'store', path: '/gestor/settings' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-900 font-display flex flex-col md:flex-row">
            {/* Sidebar Desktop */}
            <aside className={`hidden md:flex flex-col bg-white dark:bg-zinc-800 border-r border-slate-100 dark:border-white/5 h-screen sticky top-0 transition-all duration-300 z-40 print:hidden ${isCollapsed ? 'w-24 p-4' : 'w-72 p-6'}`}>

                {/* Header with Toggle */}
                <div className={`flex items-center gap-3 mb-10 ${isCollapsed ? 'justify-center flex-col' : ''}`}>
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                        <MaterialIcon name={isCollapsed ? "menu_open" : "storefront"} className="text-background-dark" />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden whitespace-nowrap">
                            <h1 className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">ifarma</h1>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Portal Gestor</span>
                        </div>
                    )}
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            title={isCollapsed ? item.label : ''}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${activeTab === item.id
                                ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                        >
                            <MaterialIcon name={item.icon} className={activeTab === item.id ? "" : "group-hover:scale-110 transition-transform"} />
                            {!isCollapsed && <span className="font-bold text-sm tracking-wide whitespace-nowrap overflow-hidden">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className={`mt-auto space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors w-full ${isCollapsed ? 'px-0' : ''}`}
                    >
                        <MaterialIcon name={isCollapsed ? "chevron_right" : "chevron_left"} />
                        {!isCollapsed && <span className="font-bold text-xs uppercase tracking-widest">Recolher</span>}
                    </button>

                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Sair" : ""}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors w-full ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <MaterialIcon name="logout" />
                        {!isCollapsed && <span className="font-bold text-sm tracking-wide whitespace-nowrap">Sair da Loja</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                {/* Mobile Header */}
                <header className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 p-4 flex justify-between items-center print:hidden">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
                            <MaterialIcon name="storefront" className="text-background-dark text-lg" />
                        </div>
                        <span className="font-black italic text-slate-900 dark:text-white">{title || 'Painel'}</span>
                    </div>
                    <button className="size-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full">
                        <MaterialIcon name="menu" />
                    </button>
                </header>

                <main className="flex-1 p-4 md:p-8 pb-32 md:pb-8 overflow-hidden">
                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white dark:bg-zinc-800 rounded-[2rem] p-4 shadow-2xl border border-slate-100 dark:border-white/5 z-50 flex justify-between items-center print:hidden">
                    {navItems.slice(0, 4).map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors ${activeTab === item.id ? 'text-primary' : 'text-slate-400'}`}
                        >
                            <MaterialIcon name={item.icon} className="text-2xl" />
                        </Link>
                    ))}
                    <Link
                        to="/gestor/settings"
                        className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-slate-400'}`}
                    >
                        <MaterialIcon name="menu" className="text-2xl" />
                    </Link>
                </nav>
            </div>
        </div>
    );
};

export default MerchantLayout;
