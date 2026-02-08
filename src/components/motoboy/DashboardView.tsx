import { MaterialIcon } from '../MaterialIcon';
import DashboardHeader from './DashboardHeader';
import StatsGrid from './StatsGrid';
import ActiveOrderCard from './ActiveOrderCard';
import OrderCard from './OrderCard';
import { useNavigate } from 'react-router-dom';

interface DashboardViewProps {
    profile: any;
    isOnline: boolean;
    toggleOnline: () => void;
    setShowMenu: (val: boolean) => void;
    stats: any;
    currentOrder: any;
    ordersQueue: any[];
    fetchOrdersQueue: () => void;
    handleAcceptOrder: (order: any) => void;
    moveOrder: (idx: number, dir: 'up' | 'down') => void;
    setCurrentView: (view: 'dashboard' | 'delivery') => void;
    unreadCount: number;
    onViewNotifications: () => void;
}

export const DashboardView = ({
    profile,
    isOnline,
    toggleOnline,
    setShowMenu,
    stats,
    currentOrder,
    ordersQueue,
    fetchOrdersQueue,
    handleAcceptOrder,
    moveOrder,
    setCurrentView,
    unreadCount,
    onViewNotifications
}: DashboardViewProps) => {
    const navigate = useNavigate();

    return (
        <div className="relative flex flex-col min-h-screen w-full bg-slate-950 text-white p-6 pb-32 max-w-[430px] mx-auto overflow-x-hidden safe-area-inset-top">
            <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

            <DashboardHeader
                name={(profile?.full_name || 'Entregador').split(' ')[0]}
                isOnline={isOnline}
                onToggleOnline={toggleOnline}
                onOpenMenu={() => setShowMenu(true)}
                unreadCount={unreadCount}
                onViewNotifications={onViewNotifications}
            />

            <StatsGrid dailyEarnings={stats.dailyEarnings} deliveriesCount={stats.deliveriesCount} />

            {currentOrder && (currentOrder.status === 'em_rota' || currentOrder.status === 'retirado') && (
                <div onClick={() => setCurrentView('delivery')} className="cursor-pointer">
                    <ActiveOrderCard order={currentOrder} />
                </div>
            )}

            <div className="mb-24 relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-3">
                        <div className={`size-2.5 rounded-full ${ordersQueue.length > 0 ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(19,236,109,1)]' : 'bg-slate-700'}`} />
                        Corridas da Fila ({ordersQueue.length})
                    </h2>
                    <button onClick={fetchOrdersQueue} className="text-slate-500 hover:text-primary transition-colors active:rotate-180 duration-500 cursor-pointer">
                        <MaterialIcon name="refresh" />
                    </button>
                </div>

                {ordersQueue.length > 0 ? (
                    <div className="space-y-2">
                        {ordersQueue.map((order, index) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onAccept={(o) => {
                                    if (index === 0) {
                                        if (o.status === 'retirado' || o.status === 'em_rota') {
                                            setCurrentView('delivery');
                                        } else {
                                            handleAcceptOrder(o);
                                        }
                                    } else {
                                        alert("Por favor, atenda os pedidos na ordem da fila ou reorganize-os.");
                                    }
                                }}
                                onMoveUp={() => moveOrder(index, 'up')}
                                onMoveDown={() => moveOrder(index, 'down')}
                                isFirst={index === 0}
                                isLast={index === ordersQueue.length - 1}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-900/40 rounded-[3rem] border border-dashed border-slate-800 shadow-inner">
                        <div className="size-20 bg-slate-800/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/5">
                            <MaterialIcon name="radar" className="text-4xl text-slate-600 animate-spin-slow" />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Buscando entregas próximas...</p>
                        <p className="text-slate-600 text-[10px] font-bold">Aumente sua área de cobertura ficando online</p>
                    </div>
                )}
            </div>

            <div className="fixed bottom-8 left-6 right-6 z-[100] max-w-[382px] mx-auto">
                <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 flex items-center justify-around shadow-2xl">
                    <button className="flex flex-col items-center gap-1.5 py-2 px-6 rounded-2xl bg-primary/10 text-primary transition-all cursor-pointer">
                        <MaterialIcon name="dashboard" className="text-2xl" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Início</span>
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
