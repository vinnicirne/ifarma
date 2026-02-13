import { useEffect, useState } from 'react';
import { Store, Package, Megaphone, ChevronRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const SystemHealth = () => {
    const navigate = useNavigate();
    const [offlinePharmacies, setOfflinePharmacies] = useState(0);
    const [pendingPharmacies, setPendingPharmacies] = useState(0);
    const [expiringPromotions, setExpiringPromotions] = useState(0);

    useEffect(() => {
        const fetchHealth = async () => {
            // 1. Farmácias Offline
            const { count: closedCount } = await supabase
                .from('pharmacies')
                .select('*', { count: 'exact', head: true })
                .eq('is_open', false)
                .eq('status', 'Aprovado');

            setOfflinePharmacies(closedCount || 0);

            // 2. Farmácias Pendentes de Aprovação
            const { count: pendingCount } = await supabase
                .from('pharmacies')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Pendente');

            setPendingPharmacies(pendingCount || 0);

            // 3. Promoções Ativas
            const { count: promoCount } = await supabase
                .from('promotions')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            setExpiringPromotions(promoCount || 0);
        };

        fetchHealth();

        const interval = setInterval(fetchHealth, 60000);
        return () => clearInterval(interval);
    }, []);

    const healthItems = [
        {
            label: 'Farmácias Fechadas',
            count: offlinePharmacies,
            icon: Store,
            color: offlinePharmacies > 5 ? 'text-red-500' : 'text-orange-500',
            bg: offlinePharmacies > 5 ? 'bg-red-500/10' : 'bg-orange-500/10',
            action: () => navigate('/dashboard/pharmacies')
        },
        {
            label: 'Aprovações Pendentes',
            count: pendingPharmacies,
            icon: ShieldCheck,
            color: pendingPharmacies > 0 ? 'text-primary' : 'text-slate-500',
            bg: pendingPharmacies > 0 ? 'bg-primary/10' : 'bg-white/5',
            action: () => navigate('/dashboard/pharmacies')
        },
        {
            label: 'Promoções Ativas',
            count: expiringPromotions,
            icon: Megaphone,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            action: () => navigate('/dashboard/promotions')
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {healthItems.map((item, i) => (
                <div
                    key={i}
                    onClick={item.action}
                    className="bg-[#111a16] border border-white/5 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-white/20 transition-all group"
                >
                    <div className="flex items-center gap-5">
                        <div className={`size-12 shrink-0 rounded-xl flex items-center justify-center ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                            <item.icon size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1 opacity-80">{item.label}</p>
                            <h4 className={`text-2xl font-black ${item.count > 0 ? 'text-white' : 'text-slate-600'}`}>
                                {item.count} <span className="text-[10px] not-italic font-normal text-slate-500">registros</span>
                            </h4>
                        </div>
                    </div>
                    <div className="size-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-background-dark transition-colors">
                        <ChevronRight size={20} />
                    </div>
                </div>
            ))}
        </div>
    );
};
