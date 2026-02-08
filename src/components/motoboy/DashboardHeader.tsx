import React from 'react';
import { MaterialIcon } from '../MaterialIcon';

interface DashboardHeaderProps {
    name: string;
    isOnline: boolean;
    onToggleOnline: () => void;
    onOpenMenu: () => void;
    unreadCount: number;
    onViewNotifications: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    name, isOnline, onToggleOnline, onOpenMenu, unreadCount, onViewNotifications
}) => {
    return (
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={onOpenMenu}
                    className="size-12 bg-slate-800/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-slate-700/50 active:scale-95 transition-all"
                >
                    <MaterialIcon name="menu" className="text-2xl" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white italic tracking-tighter leading-none">Boa tarde, {name}!</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Status do entregador</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onViewNotifications}
                    className="relative size-12 bg-slate-800/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-slate-700/50 active:scale-95 transition-all"
                >
                    <MaterialIcon name="notifications" className="text-2xl" />
                    {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 size-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-slate-900 animate-bounce">
                            {unreadCount}
                        </div>
                    )}
                </button>

                <button
                    onClick={onToggleOnline}
                    className={`relative flex items-center px-5 py-3 rounded-2xl font-black text-xs tracking-widest transition-all shadow-xl ${isOnline
                        ? 'bg-primary/20 text-primary border border-primary/50 shadow-primary/10'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-red-500/10'
                        } active:scale-95`}
                >
                    <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-primary animate-pulse' : 'bg-red-400'}`}></div>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                </button>
            </div>
        </div>
    );
};

export default DashboardHeader;
