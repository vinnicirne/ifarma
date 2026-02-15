
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import { isUuid } from '../../lib/uuidUtils';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const MerchantLayout = ({ children, activeTab, title }: { children: React.ReactNode, activeTab: string, title?: string }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [storeStatus, setStoreStatus] = React.useState(false);
    const [userId, setUserId] = React.useState<string | null>(null);

    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setUserId(session.user.id);
        });
    }, []);

    const { unreadCount } = useNotifications(userId);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/gestor/login');
    };

    React.useEffect(() => {
        const checkAutoOpen = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Pharmacy Settings
            const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single();
            const pharmacyId = profile?.pharmacy_id;

            // Also handle Admin Impersonation from localStorage if applicable (simplified here to just focus on direct link or owner)
            // But let's respect the user context

            if (!pharmacyId || !isUuid(pharmacyId)) return;

            const { data: pharmacy } = await supabase
                .from('pharmacies')
                .select('id, is_open, auto_open_status, opening_hours_start, opening_hours_end')
                .eq('id', pharmacyId)
                .single();

            if (pharmacy && pharmacy.auto_open_status && pharmacy.opening_hours_start && pharmacy.opening_hours_end) {
                const now = new Date();
                const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

                // Supports overnight shifts (e.g., 22:00 to 06:00)
                const start = pharmacy.opening_hours_start?.slice(0, 5);
                const end = pharmacy.opening_hours_end?.slice(0, 5);

                let isOpenTime = false;
                if (start && end) {
                    if (start <= end) {
                        isOpenTime = currentTime >= start && currentTime < end;
                    } else {
                        // Crossing midnight
                        isOpenTime = currentTime >= start || currentTime < end;
                    }
                }

                if (pharmacy.is_open !== isOpenTime) {
                    console.log(`⏰ Auto-Scheduler: Updating Status to ${isOpenTime ? 'OPEN' : 'CLOSED'} based on time ${currentTime}`);
                    await supabase
                        .from('pharmacies')
                        .update({ is_open: isOpenTime })
                        .eq('id', pharmacy.id);
                    setStoreStatus(isOpenTime);
                } else {
                    setStoreStatus(!!pharmacy.is_open);
                }
            } else if (pharmacy) {
                setStoreStatus(!!pharmacy.is_open);
            }
        };

        // Run immediately and then every minute
        checkAutoOpen();
        const interval = setInterval(checkAutoOpen, 60000);

        return () => clearInterval(interval);
    }, []);

    // REALTIME SYNC: Sincroniza status instantaneamente quando alterado em outra tela
    React.useEffect(() => {
        let channel: any = null;

        const handleLocalUpdate = (e: CustomEvent) => {
            console.log("MerchantLayout: Received local status update", e.detail);
            setStoreStatus(e.detail);
        };
        window.addEventListener('pharmacy_status_changed', handleLocalUpdate as EventListener);

        const syncStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Resolve ID
            let pid = localStorage.getItem('impersonatedPharmacyId');
            if (!pid) {
                const { data: owned } = await supabase.from('pharmacies').select('id').eq('owner_id', user.id).maybeSingle();
                pid = owned?.id;
                if (!pid) {
                    const { data: prof } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single();
                    pid = prof?.pharmacy_id;
                }
            }

            if (!pid || !isUuid(pid)) return;

            // Inscreve no canal
            channel = supabase.channel(`pharmacy_sync_${pid}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'pharmacies', filter: `id=eq.${pid}` },
                    (payload) => {
                        if (payload.new && typeof payload.new.is_open === 'boolean') {
                            setStoreStatus(payload.new.is_open);
                        }
                    }
                )
                .subscribe();
        };

        syncStatus();

        return () => {
            window.removeEventListener('pharmacy_status_changed', handleLocalUpdate as EventListener);
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    React.useEffect(() => {
        const updateAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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
        };
        updateAccess();
    }, []);

    const navItems = [
        { id: 'dashboard', label: 'Visão Geral', icon: 'dashboard', path: '/gestor' },
        { id: 'orders', label: 'Pedidos', icon: 'receipt_long', path: '/gestor/orders' },
        { id: 'products', label: 'Produtos', icon: 'inventory_2', path: '/gestor/products' },
        { id: 'team', label: 'Equipe / Cargos', icon: 'groups', path: '/gestor/equipe' },
        { id: 'promotions', label: 'Campanhas', icon: 'campaign', path: '/gestor/promotions' },
        { id: 'financial', label: 'Financeiro', icon: 'payments', path: '/gestor/financial' },
        { id: 'billing', label: 'Assinatura', icon: 'verified_user', path: '/gestor/billing' },
        { id: 'settings', label: 'Configurações', icon: 'settings', path: '/gestor/settings' },
    ];

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-zinc-900 font-display flex">
            {/* Sidebar Desktop */}
            <aside
                className={`hidden md:flex flex-col bg-white dark:bg-zinc-800 border-r border-slate-100 dark:border-white/5 h-full transition-all duration-300 z-40 print:hidden ${isCollapsed ? 'w-24 p-4' : 'w-72 p-6'}`}
            >
                {/* Header with Toggle */}
                <div className={`flex items-center gap-3 mb-10 ${isCollapsed ? 'justify-center flex-col' : ''}`}>
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                        <MaterialIcon name={isCollapsed ? "menu_open" : "storefront"} className="text-background-dark" />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden whitespace-nowrap">
                            <h1 className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">ifarma</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#92c9a9]">Gestor</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className={`size-1.5 rounded-full ${storeStatus ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${storeStatus ? 'text-green-500' : 'text-red-500'}`}>
                                            {storeStatus ? 'Loja Aberta' : 'Loja Fechada'}
                                        </span>
                                    </div>
                                </div>

                                {/* Manual Toggle */}
                                <button
                                    onClick={async () => {
                                        const newStatus = !storeStatus;
                                        const previousStatus = storeStatus;
                                        setStoreStatus(newStatus);
                                        window.dispatchEvent(new CustomEvent('pharmacy_status_changed', { detail: newStatus }));

                                        try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (!user) throw new Error("Não autenticado");

                                            let pharmacyId = null;
                                            const impersonatedId = localStorage.getItem('impersonatedPharmacyId');

                                            if (impersonatedId) {
                                                pharmacyId = impersonatedId;
                                            } else {
                                                const { data: owned } = await supabase.from('pharmacies').select('id').eq('owner_id', user.id).maybeSingle();
                                                if (owned) {
                                                    pharmacyId = owned.id;
                                                } else {
                                                    const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single();
                                                    pharmacyId = profile?.pharmacy_id;
                                                }
                                            }

                                            if (!pharmacyId || !isUuid(pharmacyId)) throw new Error("Farmácia não encontrada ou ID inválido");

                                            const { error } = await supabase.from('pharmacies')
                                                .update({ is_open: newStatus, auto_open_status: false })
                                                .eq('id', pharmacyId);

                                            if (error) throw error;
                                        } catch (err: any) {
                                            console.error("Erro ao atualizar status:", err);
                                            setStoreStatus(previousStatus);
                                            alert(`Erro ao atualizar status: ${err.message}`);
                                        }
                                    }}
                                    className={`ml-2 w-8 h-4 rounded-full transition-colors relative border border-white/10 ${storeStatus ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                                >
                                    <div className={`absolute top-0.5 size-2.5 rounded-full transition-all ${storeStatus ? 'left-4.5 bg-green-500' : 'left-0.5 bg-red-500'}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto hide-scrollbar pr-1">
                    <Link
                        to="/gestor/notifications"
                        title={isCollapsed ? "Notificações" : ''}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group mb-4 ${activeTab === 'notifications'
                            ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <div className="relative flex items-center justify-center">
                            <MaterialIcon name="notifications" className={activeTab === 'notifications' ? "" : "group-hover:scale-110 transition-transform"} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 size-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black border border-white dark:border-zinc-800 animate-pulse text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        {!isCollapsed && <span className="font-bold text-sm tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">Notificações</span>}
                    </Link>

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
                            {!isCollapsed && <span className="font-bold text-sm tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className={`mt-auto pt-6 space-y-2 border-t border-slate-100 dark:border-white/5 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors w-full ${isCollapsed ? 'px-0' : ''}`}
                    >
                        <MaterialIcon name={isCollapsed ? "chevron_right" : "chevron_left"} />
                        {!isCollapsed && <span className="font-bold text-[10px] uppercase tracking-widest">Recolher</span>}
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

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* Mobile Header */}
                <header className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 p-4 flex justify-between items-center print:hidden">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
                            <MaterialIcon name="storefront" className="text-background-dark text-lg" />
                        </div>
                        <span className="font-black italic text-slate-900 dark:text-white">{title || 'Painel'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/gestor/notifications" className="relative size-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full">
                            <MaterialIcon name="notifications" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 size-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-zinc-800 animate-pulse text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>
                        <button className="size-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full">
                            <MaterialIcon name="menu" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10">
                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white dark:bg-zinc-800 rounded-[2.5rem] p-4 shadow-2xl border border-slate-100 dark:border-white/5 z-50 flex justify-between items-center print:hidden">
                    {navItems.slice(0, 4).map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-colors ${activeTab === item.id ? 'text-primary' : 'text-slate-400'}`}
                        >
                            <MaterialIcon name={item.icon} className="text-2xl" />
                        </Link>
                    ))}
                    <Link
                        to="/gestor/settings"
                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-slate-400'}`}
                    >
                        <MaterialIcon name="menu" className="text-2xl" />
                    </Link>
                </nav>
            </div>
        </div>
    );
};

export default MerchantLayout;
