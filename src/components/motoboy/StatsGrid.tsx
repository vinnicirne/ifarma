import React from 'react';
import { MaterialIcon } from '../MaterialIcon';

interface StatsGridProps {
    dailyEarnings: number;
    deliveriesCount: number;
}

const StatsGrid: React.FC<StatsGridProps> = ({ dailyEarnings, deliveriesCount }) => {
    return (
        <div className="grid grid-cols-2 gap-4 mb-8 uppercase tracking-widest">
            <div className="bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group transition-all hover:bg-slate-800/60">
                <div className="absolute -top-4 -right-4 text-primary/5 group-hover:text-primary/10 transition-colors pointer-events-none">
                    <MaterialIcon name="payments" className="text-7xl" />
                </div>
                <p className="text-slate-500 text-[10px] font-black mb-1">Ganhos Hoje</p>
                <p className="text-2xl font-black text-primary italic tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyEarnings)}
                </p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group transition-all hover:bg-slate-800/60">
                <div className="absolute -top-4 -right-4 text-white/5 group-hover:text-white/20 transition-colors pointer-events-none">
                    <MaterialIcon name="motorcycle" className="text-7xl" />
                </div>
                <p className="text-slate-500 text-[10px] font-black mb-1">Corridas</p>
                <p className="text-3xl font-black text-white italic tracking-tighter">{deliveriesCount}</p>
            </div>
        </div>
    );
};

export default StatsGrid;
