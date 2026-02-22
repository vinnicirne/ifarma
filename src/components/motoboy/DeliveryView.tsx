import { MaterialIcon } from '../MaterialIcon';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { OrderCancellationModal } from '../OrderCancellationModal';

interface DeliveryViewProps {
    currentOrder: any;
    isSheetExpanded: boolean;
    setIsSheetExpanded: (val: boolean) => void;
    mapRef: React.RefObject<HTMLDivElement>;
    mapInstance: any;
    userMarker: any;
    distanceToDest: number | null;
    eta: string | null;
    unreadChatCount: number;
    setUnreadChatCount: (val: number) => void;
    hasAccepted: boolean;
    handleAcceptOrder: (order: any) => void;
    handleConfirmPickup: () => void;
    handleAutoOpenMap: () => void;
    handleArrived: () => void;
    isCancelModalOpen: boolean;
    setIsCancelModalOpen: (val: boolean) => void;
    setCurrentView: (view: 'dashboard' | 'delivery') => void;
    mapReady: boolean;
}

export const DeliveryView = ({
    currentOrder,
    isSheetExpanded,
    setIsSheetExpanded,
    mapRef,
    mapInstance,
    userMarker,
    distanceToDest,
    eta,
    unreadChatCount,
    setUnreadChatCount,
    hasAccepted,
    handleAcceptOrder,
    handleConfirmPickup,
    handleAutoOpenMap,
    handleArrived,
    isCancelModalOpen,
    setIsCancelModalOpen,
    setCurrentView,
    mapReady
}: DeliveryViewProps) => {
    const navigate = useNavigate();

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-950">
            {/* Map Section */}
            <div className={`fixed top-0 left-0 w-full z-0 transition-all duration-500 ease-in-out ${isSheetExpanded ? 'h-[45vh]' : 'h-[82vh]'}`}>
                <div className="w-full h-full relative">
                    <div ref={mapRef} id="google-map" className="w-full h-full bg-slate-900" />

                    {/* Fallback Overlay when map is loading or failed */}
                    {(!mapInstance || !mapReady) && (
                        <div className="absolute inset-0 z-[1] bg-slate-900 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-500">
                            <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                            <p className="text-white/60 text-sm font-medium tracking-wide">
                                Inicializando Google Maps...
                            </p>
                        </div>
                    )}

                    {/* Route Loading Indicator (Non-blocking) */}
                    {mapInstance && mapReady && (!distanceToDest && !eta) && (
                        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl flex items-center gap-2">
                            <div className="size-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Calculando melhor rota...</span>
                        </div>
                    )}

                    {/* Top Bar Overlay Glass */}
                    <div className="absolute top-0 left-0 right-0 z-[400] bg-slate-900/80 backdrop-blur-xl p-4 flex items-center justify-between border-b border-white/5 shadow-2xl safe-area-inset-top">
                        <button
                            onClick={() => setCurrentView('dashboard')}
                            className="size-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all active:scale-95 border border-white/10 cursor-pointer"
                        >
                            <MaterialIcon name="arrow_back" className="text-xl" />
                        </button>
                        <div className="flex-1 text-center px-4">
                            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-primary leading-none mb-1">Rota Ativa</p>
                            <h2 className="text-white text-lg font-black italic tracking-tighter leading-none">
                                {currentOrder.id.substring(0, 8).toUpperCase()}
                            </h2>
                        </div>
                        <div className="size-12" />
                    </div>

                    {/* Map Utility Actions */}
                    <div className="absolute bottom-48 right-6 z-[400] flex flex-col gap-3">
                        {/* External GPS Button (Waze/Maps) */}
                        <button
                            onClick={() => {
                                const needsToCollect = ['aceito', 'pronto_entrega', 'aguardando_retirada'].includes(currentOrder.status);
                                let dLat, dLng;

                                if (needsToCollect) {
                                    dLat = currentOrder.pharmacies?.latitude;
                                    dLng = currentOrder.pharmacies?.longitude;
                                } else {
                                    dLat = currentOrder.delivery_lat ?? currentOrder.latitude;
                                    dLng = currentOrder.delivery_lng ?? currentOrder.longitude;
                                }

                                if (dLat && dLng) {
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${dLat},${dLng}&travelmode=driving`;
                                    window.open(url, '_blank');
                                } else {
                                    const address = currentOrder.address || currentOrder.delivery_address || currentOrder.pharmacies?.address;
                                    if (address) {
                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
                                    } else {
                                        alert('Endereço de destino não encontrado.');
                                    }
                                }
                            }}
                            className="size-14 bg-primary text-slate-900 rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all animate-pulse"
                            title="Abrir no Google Maps"
                        >
                            <MaterialIcon name="navigation" className="text-2xl" />
                        </button>

                        {/* Recenter Button */}
                        <button
                            onClick={() => {
                                if (mapInstance && userMarker.current) {
                                    mapInstance.panTo(userMarker.current.getPosition());
                                    mapInstance.setZoom(17);
                                }
                            }}
                            className="size-14 bg-white text-slate-900 rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all border-4 border-slate-900/20 cursor-pointer"
                        >
                            <MaterialIcon name="my_location" className="text-2xl" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Sheet UI (Uber Style) */}
            <div
                className={`fixed left-0 right-0 z-[50] bg-slate-900 border-t border-white/10 shadow-[0_-15px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-t-[3rem] flex flex-col ${isSheetExpanded ? 'top-[42vh] bottom-0' : 'bottom-0 h-[170px]'}`}
            >
                {/* Handle */}
                <div className="w-full h-10 flex items-center justify-center cursor-pointer shrink-0" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
                    <div className={`h-1.5 w-16 rounded-full transition-all ${isSheetExpanded ? 'bg-slate-700' : 'bg-primary animate-pulse shadow-[0_0_10px_rgba(19,236,109,0.5)]'}`} />
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
                        <div className="size-14 bg-slate-800 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                            <MaterialIcon name="storefront" className="text-2xl text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black italic tracking-tight truncate text-white uppercase leading-none">
                                {currentOrder.pharmacies?.name || 'Farmácia iFarma'}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${currentOrder.status === 'retirado' || currentOrder.status === 'em_rota' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {currentOrder.status === 'retirado' || currentOrder.status === 'em_rota' ? 'ENTREGA' : 'COLETA'}
                                </span>
                                <span className="text-white/20">•</span>
                                <span className="text-lg font-black text-white italic tracking-tighter">
                                    {distanceToDest ? (distanceToDest / 1000).toFixed(1) : '--'} <span className="text-[10px] uppercase text-slate-500 not-italic ml-0.5">km</span>
                                </span>
                                {eta && (
                                    <>
                                        <span className="text-white/20">•</span>
                                        <span className="text-lg font-black text-primary italic tracking-tighter">
                                            {eta.replace('mins', 'min').replace('minutos', 'min')}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <MaterialIcon name={isSheetExpanded ? "keyboard_arrow_down" : "keyboard_arrow_up"} className="text-slate-500" />
                    </div>

                    <div className={`flex-1 overflow-y-auto px-6 pb-20 safe-area-inset-bottom transition-all duration-300 ${isSheetExpanded ? 'opacity-100' : 'opacity-0 invisible h-0'}`}>
                        <div className="h-6" />
                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <a href={`tel:${currentOrder.profiles?.phone || ''}`} className="flex items-center justify-center gap-3 py-5 bg-slate-800 rounded-[1.5rem] font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 border border-white/5 cursor-pointer">
                                <MaterialIcon name="call" className="text-slate-400" /> Ligar
                            </a>
                            <button
                                onClick={() => {
                                    setUnreadChatCount(0);
                                    navigate('/motoboy-chat/' + currentOrder.id);
                                }}
                                className="relative flex items-center justify-center gap-3 py-5 bg-slate-800 rounded-[1.5rem] font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 border border-white/5 cursor-pointer"
                            >
                                <MaterialIcon name="chat" className="text-slate-400" /> Chat
                                {unreadChatCount > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-lg ring-4 ring-slate-900">
                                        {unreadChatCount}
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Info Section */}
                        <div className="space-y-6 mb-8">
                            <div className="flex gap-4">
                                <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-black text-primary border border-white/5 shrink-0">
                                    {(currentOrder.profiles?.full_name || currentOrder.client_name || 'C').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Destinatário</p>
                                    <p className="text-lg font-bold text-white italic leading-none">{currentOrder.profiles?.full_name || currentOrder.client_name || 'Cliente'}</p>
                                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">{currentOrder.address}</p>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-5 rounded-[2rem] border border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pagamento</p>
                                    <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                        {currentOrder.payment_method === 'pix' ? 'PIX' : currentOrder.payment_method === 'cash' ? 'DINHEIRO' : 'CARTÃO'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total a Receber</p>
                                        <p className="text-2xl font-black text-white italic tracking-tighter">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total_price || currentOrder.total_amount || 0)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Seu Repasse</p>
                                        <p className="text-xl font-black text-primary italic tracking-tighter">
                                            +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.delivery_fee || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Button */}
                        <div className="space-y-4">

                            <div className="w-full">
                                {['pronto_entrega', 'aguardando_motoboy', 'aguardando_retirada', 'aceito'].includes(currentOrder.status) ? (
                                    (!hasAccepted) ? (
                                        <button onClick={() => handleAcceptOrder(currentOrder)} className="w-full bg-green-600 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-green-600/20 uppercase tracking-widest text-sm cursor-pointer">
                                            <MaterialIcon name="thumb_up" /> Aceitar Corrida
                                        </button>
                                    ) : (
                                        <button onClick={handleConfirmPickup} className="w-full bg-primary text-slate-900 font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-primary/20 uppercase tracking-widest text-sm cursor-pointer">
                                            <MaterialIcon name="inventory" /> Confirmar Retirada
                                        </button>
                                    )
                                ) : (currentOrder.status === 'retirado') ? (
                                    <button onClick={handleAutoOpenMap} className="w-full bg-blue-600 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-blue-500/20 uppercase tracking-widest text-sm cursor-pointer">
                                        <MaterialIcon name="navigation" /> Iniciar Rota de Entrega
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const isClose = distanceToDest === null || distanceToDest <= 1000;
                                            if (isClose || window.confirm("Você parece estar longe do destino. Deseja finalizar mesmo assim?")) {
                                                navigate(`/motoboy-confirm/${currentOrder.id}`);
                                            }
                                        }}
                                        className="w-full bg-primary text-slate-900 font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-primary/20 uppercase tracking-widest text-sm cursor-pointer"
                                    >
                                        <MaterialIcon name="check_circle" /> Finalizar Entrega
                                    </button>
                                )}
                            </div>

                            <button onClick={() => setIsCancelModalOpen(true)} className="w-full text-center text-[10px] font-black uppercase tracking-[0.3em] text-red-500/50 hover:text-red-500 transition-colors py-4 cursor-pointer">
                                Reportar Problema / Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <OrderCancellationModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                userRole="motoboy"
                onConfirm={async (reason) => {
                    if (!currentOrder?.id) return;
                    const { error } = await supabase.from('orders').update({ status: 'cancelado', cancellation_reason: reason }).eq('id', currentOrder.id);
                    if (!error) {
                        setIsCancelModalOpen(false);
                        setCurrentView('dashboard');
                    }
                }}
            />
        </div>
    );
};
