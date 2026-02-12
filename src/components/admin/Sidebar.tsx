import { useNavigate, NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    LayoutDashboard,
    Users,
    Store,
    Bike,
    Megaphone,
    Tag,
    Settings,
    LayoutGrid,
    Package,
    Bell,
    FileText,
    DollarSign,
    Layers,
    ShieldCheck,
    Navigation,
    LogOut,
    BookmarkCheck
} from 'lucide-react';

const Sidebar = ({ profile }: { profile?: any }) => {
    const navigate = useNavigate();

    // Nova Estrutura Organizada por Seções (UX Refined)
    const menuSections = [
        {
            title: 'PRINCIPAL',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'operator'] },
            ]
        },
        {
            title: 'OPERAÇÃO',
            items: [
                { icon: Navigation, label: 'Pedidos & Mapa', path: '/dashboard/tracking', roles: ['admin', 'operator'] },
                { icon: Bike, label: 'Entregadores', path: '/dashboard/motoboys', roles: ['admin', 'operator'] },
            ]
        },
        {
            title: 'MARKETING',
            items: [
                { icon: Layers, label: 'Feed do App', path: '/dashboard/feed', roles: ['admin', 'operator'] },
                { icon: Megaphone, label: 'Banners & Ads', path: '/dashboard/ads', roles: ['admin', 'operator'] },
                { icon: Tag, label: 'Promoções', path: '/dashboard/promotions', roles: ['admin', 'operator'] },
                { icon: Bell, label: 'Notificações Push', path: '/dashboard/notifications', roles: ['admin', 'operator'] },
            ]
        },
        {
            title: 'CATÁLOGO',
            items: [
                { icon: Package, label: 'Produtos', path: '/dashboard/products', roles: ['admin', 'operator'] },
                { icon: LayoutGrid, label: 'Categorias', path: '/dashboard/categories', roles: ['admin', 'operator'] },
                { icon: BookmarkCheck, label: 'Coleções', path: '/dashboard/collections', roles: ['admin', 'operator'] },
            ]
        },
        {
            title: 'PARCEIROS',
            items: [
                { icon: Store, label: 'Lojas & Farmácias', path: '/dashboard/pharmacies', roles: ['admin', 'operator'] },
            ]
        },
        {
            title: 'FINANCEIRO',
            items: [
                { icon: DollarSign, label: 'Monetização', path: '/dashboard/monetization', roles: ['admin'] },
                { icon: FileText, label: 'Relatórios', path: '/dashboard/reports', roles: ['admin', 'operator'] },
            ]
        },
        {
            title: 'SISTEMA',
            items: [
                { icon: Users, label: 'Usuários', path: '/dashboard/users', roles: ['admin', 'operator'] },
                { icon: Settings, label: 'Ajustes Técnicos', path: '/dashboard/settings', roles: ['admin'] },
            ]
        }
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#0a0f0d] flex flex-col z-50 border-r border-white/5 shadow-2xl">
            {/* Brand Logo & Profile Section */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-primary flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(19,236,109,0.3)] shrink-0">
                            <ShieldCheck size={18} className="text-[#0a0f0d]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-[900] italic text-lg leading-none tracking-tighter">Admin</span>
                            <span className="text-primary font-black text-[8px] tracking-[0.1em] leading-none mt-1">IFARMA</span>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        title="Finalizar Sessão"
                        className="size-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                    >
                        <LogOut size={14} />
                    </button>
                </div>

                {/* Compact Profile Card */}
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <p className="text-white font-black italic text-[10px] truncate leading-none mb-1">
                            {profile?.full_name?.split(' ')[0] || 'Gestor'}
                        </p>
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest truncate leading-none">
                            {profile?.role === 'admin' ? 'Acesso Total' : 'Operador'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Sections */}
            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto hide-scrollbar">
                {menuSections.map((section, sIdx) => {
                    const filteredItems = section.items.filter(item =>
                        !item.roles || item.roles.includes(profile?.role || 'admin')
                    );

                    if (filteredItems.length === 0) return null;

                    return (
                        <div key={sIdx} className="space-y-1">
                            <h3 className="px-6 text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 px-6">
                                {section.title}
                            </h3>
                            <div className="space-y-0.5">
                                {filteredItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/dashboard'}
                                        className={({ isActive }) => `
                                            flex items-center gap-4 px-6 py-3 rounded-2xl transition-all duration-300 group
                                            ${isActive
                                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(19,236,109,0.1)]'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
                                        `}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <item.icon size={18} className={`${isActive ? 'stroke-[2.5px]' : 'stroke-[2px] opacity-70 group-hover:opacity-100'}`} />
                                                <span className="text-[11px] font-bold tracking-tight italic">{item.label}</span>
                                                {isActive && (
                                                    <div className="size-1.5 bg-primary rounded-full ml-auto shadow-[0_0_8px_#13ec6d]"></div>
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
};

export default Sidebar;
