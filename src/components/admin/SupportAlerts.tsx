import { useEffect, useState } from 'react';
import { AlertCircle, Phone, X, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Alert {
    id: string;
    type: string;
    severity: string;
    region: string;
    message: string;
    created_at: string;
    phone?: string;
}

const SupportAlerts = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [showNotification, setShowNotification] = useState(false);
    const [latestAlert, setLatestAlert] = useState<Alert | null>(null);

    const resolveAlert = async (id: string) => {
        const { error } = await supabase
            .from('system_alerts')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }
    };

    const resolveAll = async () => {
        const { error } = await supabase
            .from('system_alerts')
            .update({ is_read: true })
            .eq('is_read', false);

        if (!error) {
            setAlerts([]);
        }
    };

    const handleWhatsApp = (phone?: string) => {
        const targetPhone = phone || '550000000000';
        window.open(`https://wa.me/${targetPhone}?text=Olá, sou o Admin do Ifarma. Recebemos um alerta operacional em sua loja: ${latestAlert?.message || ''}`, '_blank');
    };

    useEffect(() => {
        const fetchAlerts = async () => {
            const { data } = await supabase
                .from('system_alerts')
                .select('*')
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) setAlerts(data);
        };

        fetchAlerts();

        const alertsChannel = supabase
            .channel('system_alerts_live')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_alerts' }, (payload) => {
                const newAlert = payload.new as Alert;
                setAlerts(prev => [newAlert, ...prev].slice(0, 5));
                setLatestAlert(newAlert);
                setShowNotification(true);

                setTimeout(() => setShowNotification(false), 8000);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_alerts', filter: 'is_read=eq.true' }, (payload) => {
                const updatedAlert = payload.new as Alert;
                setAlerts(prev => prev.filter(a => a.id !== updatedAlert.id));
            })
            .subscribe();

        return () => {
            alertsChannel.unsubscribe();
        };
    }, []);

    if (alerts.length === 0 && !showNotification) return null;

    return (
        <>
            {/* Toast de Alerta Real-time */}
            {showNotification && latestAlert && (
                <div className="fixed top-8 right-8 z-[100] animate-bounce-in">
                    <div className={`p-6 rounded-[32px] shadow-[0_20px_50px_rgba(239,68,68,0.3)] border border-white/20 flex gap-4 items-start max-w-sm relative ${latestAlert.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                        } text-white`}>
                        <button
                            onClick={() => setShowNotification(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="font-black italic text-xs uppercase tracking-widest opacity-80 mb-1">
                                Alerta {latestAlert.severity === 'critical' ? 'Crítico' : 'de Sistema'}
                            </p>
                            <p className="font-bold text-sm leading-tight">{latestAlert.message}</p>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => handleWhatsApp(latestAlert.phone)}
                                    className="bg-white text-slate-900 font-black text-[10px] tracking-widest uppercase px-4 py-2 rounded-xl hover:bg-white/90 transition-all flex items-center gap-2"
                                >
                                    <Phone size={12} />
                                    Agir Agora
                                </button>
                                <button
                                    onClick={() => resolveAlert(latestAlert.id)}
                                    className="bg-black/20 text-white font-black text-[10px] tracking-widest uppercase px-4 py-2 rounded-xl hover:bg-black/30 transition-all"
                                >
                                    Ignorar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Feed de Alertas no Dashboard */}
            {alerts.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-[32px] p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Bell className="text-red-500" size={20} />
                            <h3 className="text-white font-[900] italic text-lg">Alertas Live</h3>
                        </div>
                        <button
                            onClick={resolveAll}
                            className="bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase hover:bg-red-600 transition-colors"
                        >
                            Limpar Tudo
                        </button>
                    </div>

                    <div className="space-y-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-[#1a1111] border border-red-500/10 p-4 rounded-2xl flex gap-4 group hover:border-red-500/30 transition-all relative">
                                <div className={`size-10 rounded-xl flex items-center justify-center ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                                    }`}>
                                    <AlertCircle size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-white text-xs font-bold italic">{alert.region || 'Sistema'}</p>
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${alert.type === 'pharmacy_closed_attempt' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-400'
                                                }`}>
                                                {alert.type === 'pharmacy_closed_attempt' ? 'Venda Perdida' : alert.type}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-black opacity-50 uppercase tracking-widest">
                                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <p className="text-slate-400 text-[11px] leading-relaxed mb-3">{alert.message}</p>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleWhatsApp(alert.phone)}
                                            className="text-[9px] font-black uppercase text-primary hover:underline"
                                        >
                                            Contatar
                                        </button>
                                        <button
                                            onClick={() => resolveAlert(alert.id)}
                                            className="text-[9px] font-black uppercase text-slate-500 hover:text-white"
                                        >
                                            Marcar como lido
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

export default SupportAlerts;
