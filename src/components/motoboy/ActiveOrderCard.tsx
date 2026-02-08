import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../MaterialIcon';

interface ActiveOrderCardProps {
    order: any;
}

const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({ order }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-[2.5rem] mb-8 flex items-center justify-between shadow-2xl shadow-blue-500/40 relative overflow-hidden group">
            {/* Decorative pulse effect */}
            <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
                <div className="size-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-inner">
                    <MaterialIcon name="navigation" className="text-3xl animate-bounce" />
                </div>
                <div>
                    <h3 className="font-black text-white italic text-xl leading-none">Corrida Ativa</h3>
                    <p className="text-xs text-blue-100 font-bold uppercase tracking-[0.15em] mt-2 opacity-80">
                        #{order.id.substring(0, 5)} • {(order.profiles?.full_name || order.customer_name || 'Cliente').split(' ')[0]}
                    </p>
                </div>
            </div>
            <button
                onClick={() => {
                    // Already on dashboard, but maybe the user wants to trigger a scroll or refocus
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="relative z-10 bg-white text-blue-600 px-6 py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-indigo-50 transition-all shadow-xl active:scale-95"
            >
                MAPA GPS
            </button>
        </div>
    );
};

export default ActiveOrderCard;
