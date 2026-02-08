import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../hooks/useNotifications';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const MotoboyNotifications = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setUserId(session.user.id);
        });
    }, []);

    const { notifications, markAsRead, markAllAsRead, loading } = useNotifications(userId);

    const getIcon = (type: string) => {
        switch (type) {
            case 'chat': return { icon: 'chat_bubble', color: 'text-blue-400', bg: 'bg-blue-400/10' };
            case 'order': return { icon: 'package_2', color: 'text-green-400', bg: 'bg-green-400/10' };
            default: return { icon: 'notifications', color: 'text-primary', bg: 'bg-primary/10' };
        }
    };

    return (
        <div className="flex flex-col min-h-screen w-full max-w-[480px] mx-auto bg-slate-950 text-white relative font-display antialiased">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl pt-4 pb-4 px-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="size-11 bg-white/5 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                    >
                        <MaterialIcon name="arrow_back" className="text-white" />
                    </button>
                    <h1 className="text-xl font-black italic tracking-tighter uppercase">Notificações</h1>
                    <button
                        onClick={markAllAsRead}
                        className="text-primary text-[10px] font-black uppercase tracking-widest"
                    >
                        Limpar
                    </button>
                </div>
            </header>

            {/* Notification List */}
            <main className="flex-1 px-6 space-y-4 py-8 pb-32 overflow-y-auto">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 italic">
                        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                        <p className="text-[10px] uppercase font-black tracking-widest">Buscando alertas...</p>
                    </div>
                )}

                {!loading && notifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                        <MaterialIcon name="notifications_off" className="text-6xl mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-[0.2em] text-[10px]">Silêncio absoluto por aqui</p>
                    </div>
                )}

                {notifications.map((notif) => {
                    const style = getIcon(notif.type);
                    const orderId = notif.data?.orderId; // We need to make sure 'data' is passed

                    return (
                        <div
                            key={notif.id}
                            onClick={async () => {
                                if (!notif.is_read) markAsRead(notif.id);
                                if (notif.type === 'chat' && orderId) {
                                    navigate(`/motoboy-chat/${orderId}`);
                                } else if (notif.type === 'order') {
                                    navigate('/motoboy-dashboard');
                                }
                            }}
                            className={`group flex items-start gap-4 p-5 rounded-[2rem] border transition-all cursor-pointer ${notif.is_read ? 'bg-slate-900/30 border-white/5 opacity-50' : 'bg-slate-900 border-primary/20 shadow-lg shadow-primary/5 active:scale-[0.98]'}`}
                        >
                            <div className={`${style.bg} ${style.color} flex items-center justify-center rounded-2xl shrink-0 size-14 border border-white/5 shadow-inner`}>
                                <MaterialIcon name={style.icon} className="text-2xl" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0 pt-1">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="text-white font-black italic tracking-tight text-lg leading-tight uppercase truncate">{notif.title}</p>
                                    {!notif.is_read && <div className="size-2 rounded-full bg-primary shadow-[0_0_8px_rgba(19,236,109,1)] shrink-0 mt-1.5" />}
                                </div>
                                <p className="text-slate-400 text-sm mt-2 leading-relaxed">{notif.message}</p>
                                <p className="text-slate-600 text-[9px] mt-4 font-black uppercase tracking-widest">
                                    {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Motoboy Bottom Navigation */}
            <div className="fixed bottom-8 left-6 right-6 z-[100] max-w-[382px] mx-auto">
                <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 flex items-center justify-around shadow-2xl">
                    <button onClick={() => navigate('/motoboy-dashboard')} className="flex flex-col items-center gap-1.5 py-2 px-6 rounded-2xl text-slate-500 hover:text-white transition-all cursor-pointer">
                        <MaterialIcon name="dashboard" className="text-2xl" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
                    </button>
                    <button onClick={() => navigate('/motoboy-history')} className="flex flex-col items-center gap-1.5 py-2 px-6 rounded-2xl text-slate-500 hover:text-white transition-all cursor-pointer">
                        <MaterialIcon name="history" className="text-2xl" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Histórico</span>
                    </button>
                    <button onClick={() => navigate('/motoboy-earnings')} className="flex flex-col items-center gap-1.5 py-2 px-6 rounded-2xl text-slate-500 hover:text-white transition-all cursor-pointer">
                        <MaterialIcon name="account_balance_wallet" className="text-2xl" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Saldo</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MotoboyNotifications;
