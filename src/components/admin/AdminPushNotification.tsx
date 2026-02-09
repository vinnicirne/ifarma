import React, { useState, useEffect } from 'react';
import { Send, Users, Truck, Store, Bell, CheckCircle, AlertTriangle } from 'lucide-react';
import { sendBroadcastNotification } from '../../utils/notifications';

export const AdminPushNotification = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<'customer' | 'motoboy' | 'pharmacy'>('customer');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Auto-clear success message
    useEffect(() => {
        if (status?.type === 'success') {
            const timer = setTimeout(() => setStatus(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const handleSend = async () => {
        if (!title || !message) {
            setStatus({ type: 'error', message: 'Preencha o título e a mensagem.' });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const res = await sendBroadcastNotification(target, title, message);
            if (res) {
                setStatus({ type: 'success', message: 'Notificação enviada com sucesso!' });
                setTitle('');
                setMessage('');
            } else {
                setStatus({ type: 'error', message: 'Erro ao enviar. Verifique se há usuários com tokens.' });
            }
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: 'Erro inesperado ao enviar.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl flex flex-col h-full relative overflow-hidden group">
            {/* Status Feedback Banner */}
            {status && (
                <div className={`absolute top-0 left-0 right-0 p-4 flex items-center justify-center gap-2 animate-slide-down transition-all z-10 ${status.type === 'success' ? 'bg-emerald-500/20 text-emerald-500 backdrop-blur-md' : 'bg-red-500/20 text-red-500 backdrop-blur-md'
                    }`}>
                    {status.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{status.message}</span>
                </div>
            )}

            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Bell size={18} className="text-primary" />
                </div>
                <h3 className="text-white text-xl font-[900] italic tracking-tight uppercase">Push Notifications</h3>
            </div>

            <div className="space-y-6 flex-1">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                        Público-Alvo
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'customer', label: 'Clientes', icon: Users },
                            { id: 'motoboy', label: 'Entregadores', icon: Truck },
                            { id: 'pharmacy', label: 'Farmácias', icon: Store },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTarget(t.id as any)}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1 ${target === t.id
                                    ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5'
                                    : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'
                                    }`}
                            >
                                <t.icon size={18} />
                                <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all font-bold placeholder:font-normal"
                            placeholder="Ex: Promoção Relâmpago ⚡"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Mensagem</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all font-bold placeholder:font-normal"
                            placeholder="Descreva a novidade aqui..."
                            rows={4}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
                <button
                    onClick={handleSend}
                    disabled={loading || !title || !message}
                    className="w-full bg-primary text-[#0a0f0d] font-[900] italic h-14 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 uppercase tracking-tight"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin size-5 border-2 border-black border-t-transparent rounded-full" />
                            <span>Enviando...</span>
                        </>
                    ) : (
                        <>
                            <Send size={18} /> Enviar Notificação
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
