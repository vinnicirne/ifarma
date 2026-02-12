import React from 'react';
import { AdminPushNotification } from '../../components/admin/AdminPushNotification';
import { Bell } from 'lucide-react';

const AdminNotifications = () => {
    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-center gap-4">
                <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                    <Bell size={24} />
                </div>
                <div>
                    <h2 className="text-3xl font-[900] italic text-white tracking-tight leading-none">Notificações Push</h2>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
                        Marketing & Engajamento
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AdminPushNotification />

                <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl flex flex-col justify-center text-center h-[450px]">
                    <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 mx-auto">
                        <Bell size={48} />
                    </div>
                    <h3 className="text-xl font-black italic text-white mb-2">Central de Marketing</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-black opacity-50 mb-6">
                        Dicas para melhor conversão
                    </p>

                    <ul className="text-left space-y-4 max-w-sm mx-auto">
                        <li className="flex gap-3 text-slate-400 text-xs leading-relaxed">
                            <span className="text-primary font-black">•</span>
                            Envie notificações em horários de pico (11:00 - 13:00 e 18:00 - 20:00).
                        </li>
                        <li className="flex gap-3 text-slate-400 text-xs leading-relaxed">
                            <span className="text-primary font-black">•</span>
                            Use emojis no título para aumentar a taxa de abertura em até 20%.
                        </li>
                        <li className="flex gap-3 text-slate-400 text-xs leading-relaxed">
                            <span className="text-primary font-black">•</span>
                            Segmente suas mensagens: Motoqueiros precisam de alertas operacionais, Clientes gostam de promoções.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;
