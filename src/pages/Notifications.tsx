import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../hooks/useNotifications';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const Notifications = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'Todas' | 'Promoções' | 'Pedidos' | 'Saúde'>('Todas');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setUserId(session.user.id);
        });
    }, []);

    const { notifications, markAsRead, markAllAsRead, loading } = useNotifications(userId);

    const filters = [
        { id: 'Todas', label: 'Todas', icon: 'notifications' },
        { id: 'Promoções', label: 'Promoções', icon: 'local_offer' },
        { id: 'Pedidos', label: 'Pedidos', icon: 'package_2' },
        { id: 'Saúde', label: 'Saúde', icon: 'favorite' }
    ];

    const filteredNotifications = notifications.filter(n => {
        if (activeFilter === 'Todas') return true;
        if (activeFilter === 'Promoções') return n.type === 'promo';
        if (activeFilter === 'Pedidos') return n.type === 'order';
        if (activeFilter === 'Saúde') return n.type === 'health';
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'promo': return { icon: 'local_offer', color: 'text-orange-500', bg: 'bg-orange-500/20' };
            case 'order': return { icon: 'package_2', color: 'text-blue-500', bg: 'bg-blue-500/20' };
            case 'health': return { icon: 'favorite', color: 'text-rose-500', bg: 'bg-rose-500/20' };
            default: return { icon: 'notifications', color: 'text-primary', bg: 'bg-primary/20' };
        }
    };

    return (
        <div className="flex flex-col min-h-screen w-full md:max-w-6xl mx-auto bg-background-light dark:bg-background-dark shadow-2xl md:shadow-none relative font-display text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200">

            {/* Header */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md pt-4 pb-4 px-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 active:scale-95 transition-transform"
                    >
                        <MaterialIcon name="arrow_back_ios" className="text-slate-900 dark:text-white" />
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Notificações</h1>
                    </button>
                    <button
                        onClick={markAllAsRead}
                        className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity"
                    >
                        Marcar todas
                    </button>
                </div>
            </header>

            {/* Filters (Chips) */}
            <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
                {filters.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id as any)}
                        className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-all ${activeFilter === filter.id ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-200 dark:bg-[#232f48]'}`}
                    >
                        <MaterialIcon
                            name={filter.icon}
                            className={`text-[18px] ${activeFilter === filter.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
                        />
                        <p className={`text-sm font-medium ${activeFilter === filter.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{filter.label}</p>
                    </button>
                ))}
            </div>

            {/* Notification List */}
            <main className="flex-1 px-4 pb-10">
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50 italic">
                            <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                            <p>Buscando alertas...</p>
                        </div>
                    )}

                    {!loading && filteredNotifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <MaterialIcon name="notifications_off" className="text-6xl mb-4 opacity-20" />
                            <p className="font-bold italic">Nenhuma notificação encontrada</p>
                        </div>
                    )}

                    {filteredNotifications.map((notif) => {
                        const style = getIcon(notif.type);
                        return (
                            <div
                                key={notif.id}
                                onClick={() => !notif.is_read && markAsRead(notif.id)}
                                className={`flex items-start gap-4 p-4 rounded-xl border shadow-sm relative transition-all cursor-pointer ${notif.is_read ? 'bg-slate-50/50 dark:bg-[#1a2333]/40 border-transparent opacity-80' : 'bg-white dark:bg-[#1a2333] border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-[#1a2333]/80'}`}
                            >
                                {!notif.is_read && (
                                    <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                )}
                                <div className={`${style.bg} ${style.color} flex items-center justify-center rounded-lg shrink-0 size-12`}>
                                    <MaterialIcon name={style.icon} style={{ fontVariationSettings: "'FILL' 1" }} />
                                </div>
                                <div className="flex flex-col flex-1 pr-4">
                                    <p className="text-slate-900 dark:text-white text-base font-semibold leading-tight">{notif.title}</p>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-snug">{notif.message}</p>
                                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium">
                                        {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default Notifications;
