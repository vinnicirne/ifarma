import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    LayoutDashboard,
    Users,
    Store,
    Bike,
    Megaphone,
    Tag,
    Settings,
    ShieldCheck,
    Navigation,
    LogOut
} from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();
    const menuItems = [
        { icon: LayoutDashboard, label: 'DASHBOARD', path: '/dashboard' },
        { icon: Navigation, label: 'RASTREAMENTO', path: '/dashboard/tracking' },
        { icon: Users, label: 'USUÁRIOS', path: '/dashboard/users' },
        { icon: Store, label: 'FARMÁCIAS', path: '/dashboard/pharmacies' },
        { icon: Bike, label: 'MOTOBOYS', path: '/dashboard/motoboys' },
        { icon: Megaphone, label: 'ANÚNCIOS', path: '/dashboard/ads' },
        { icon: Tag, label: 'PROMOÇÕES', path: '/dashboard/promotions' },
        { icon: Settings, label: 'CONFIGURAÇÕES', path: '/dashboard/settings' },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#0a0f0d] flex flex-col z-50 border-r border-white/5 shadow-2xl">
            {/* ... brand ... */}
            <div className="p-8">
                <div className="flex items-center gap-3">
                    <div className="size-12 bg-primary flex items-center justify-center rounded-2xl shadow-[0_0_20px_rgba(19,236,109,0.3)]">
                        <ShieldCheck size={28} className="text-[#0a0f0d]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-[900] italic text-2xl leading-none tracking-tighter">Admin</span>
                        <span className="text-primary font-black text-[10px] tracking-[0.2em] mt-1">PHARMALINK</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto hide-scrollbar">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        className={({ isActive }) => `
              flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group
              ${isActive
                                ? 'bg-primary text-[#0a0f0d] shadow-[0_0_25px_rgba(19,236,109,0.2)]'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'}
            `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={22} className={`${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                                <span className="text-sm font-[900] italic tracking-tight">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile and Logout */}
            <div className="p-4 mt-auto space-y-2">
                <div className="bg-white/5 rounded-[24px] p-4 border border-white/5 flex items-center gap-4 group cursor-pointer hover:bg-white/10 transition-all">
                    <div className="size-12 rounded-xl bg-[#1a2b23] border border-white/10 flex items-center justify-center overflow-hidden">
                        <Users size={24} className="text-primary opacity-50" />
                    </div>
                    <div className="flex flex-col flex-1">
                        <p className="text-white font-[900] italic text-sm leading-tight">Painel Admin</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SISTEMA</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                >
                    <LogOut size={16} />
                    Sair do Sistema
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
