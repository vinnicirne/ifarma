import { AdminPushNotification } from '../../components/admin/AdminPushNotification';
import { PageHeader } from '../../components/Shared';

export const Notifications = () => {
    return (
        <div className="space-y-8 animate-slide-up">
            <PageHeader
                title="Central de Notificações"
                subtitle="Envie push notifications para clientes, motoboys e farmácias."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl">
                    <AdminPushNotification />
                </div>

                <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl">
                    <h3 className="text-white text-xl font-[900] italic tracking-tight mb-4">Histórico de Envios</h3>
                    <p className="text-slate-500 text-xs uppercase tracking-widest font-black opacity-50">Nenhum envio registrado recentemente.</p>
                </div>
            </div>
        </div>
    );
};
