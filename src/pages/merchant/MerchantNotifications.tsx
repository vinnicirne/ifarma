
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import MerchantLayout from './MerchantLayout';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const MerchantNotifications = () => {
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
        <MerchantLayout activeTab="notifications" title="Notificações">
            <div className="flex flex-col w-full h-full max-w-4xl mx-auto">
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">
                        Central de Alertas
                    </h2>
                    <button
                        onClick={markAllAsRead}
                        disabled={loading || notifications.length === 0}
                        className="text-sm font-bold text-primary hover:text-primary-dark disabled:opacity-50 transition-colors"
                    >
                        Marcar todas como lidas
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar mb-6">
                    {filters.map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeFilter === filter.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'
                                }`}
                        >
                            <MaterialIcon name={filter.icon} className="text-lg" />
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-20">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-slate-400 text-sm font-medium animate-pulse">Carregando alertas...</p>
                        </div>
                    )}

                    {!loading && filteredNotifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600">
                            <MaterialIcon name="notifications_off" className="text-6xl mb-4 opacity-50" />
                            <p className="font-bold text-lg italic">Nenhuma notificação encontrada</p>
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
            </div>
        </MerchantLayout>
    );
};

export default MerchantNotifications;
