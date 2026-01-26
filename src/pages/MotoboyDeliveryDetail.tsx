import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const MotoboyDeliveryDetail = () => {
    const navigate = useNavigate();

    // Custom primary color for this page (Green - #13ec6d)
    const deliveryTheme = {
        '--delivery-primary': '#13ec6d',
        '--delivery-bg-dark': '#102218',
    } as React.CSSProperties;

    return (
        <div className="bg-background-light dark:bg-[#102218] text-slate-900 dark:text-white min-h-screen flex flex-col font-display transition-colors duration-200" style={deliveryTheme}>
            {/* TopAppBar */}
            <header className="sticky top-0 z-10 flex items-center bg-background-light dark:bg-[#102218] p-4 pb-2 justify-between border-b border-gray-200 dark:border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="flex size-12 shrink-0 items-center justify-start cursor-pointer active:scale-90 transition-transform text-slate-900 dark:text-white"
                >
                    <MaterialIcon name="arrow_back_ios" className="text-2xl" />
                </button>
                <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Detalhe da Entrega</h2>
                <div className="flex w-12 items-center justify-end">
                    <p className="text-[#13ec6d] text-base font-bold leading-normal tracking-[0.015em] shrink-0">#4582</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
                {/* ProfileHeader */}
                <div className="flex p-4 @container border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                    <div className="flex w-full flex-col gap-4 @[520px]:flex-row @[520px]:justify-between @[520px]:items-center">
                        <div className="flex gap-4">
                            <div
                                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-20 w-20 border-2 border-[#13ec6d]/30"
                                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC9T3gILH5gCZCtMJqJa1Nvqc0yNQ13AXRM2QfP54386tzxVqnQqxUdjI5fzpcT5HNgOccIhFwMzpzVL19yM1MEopqRN4d_POUdJQoaSOFn49UFNEtNUBzRtIVFZ-ckXxFxfPHTBEnfJGLnMdUwYdEqd4Y1KMLWD6MNtyB5lF-EQLZVAZKnfEmGCu2NzxYxBtHIwqlIzxI3V3QOzbf-euBQiJ0e2i8CTBDCmXwqU7XJ41YpcdaoZoJSVMvp6l-E9GNRiPut-WW6SA")' }}
                            >
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-slate-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">João Silva</p>
                                <p className="text-[#13ec6d]/70 text-base font-normal leading-normal">Pedido #4582 • 3 itens</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="size-2 rounded-full bg-[#13ec6d] animate-pulse"></span>
                                    <p className="text-[#13ec6d] text-sm font-semibold uppercase tracking-wider">Em Rota</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address Section */}
                <div className="pt-6">
                    <div className="flex items-center px-4 gap-2 text-[#13ec6d]">
                        <MaterialIcon name="location_on" className="text-sm" />
                        <span className="text-xs font-bold uppercase tracking-widest">Endereço de Entrega</span>
                    </div>
                    <h3 className="text-slate-900 dark:text-white tracking-light text-2xl font-bold leading-tight px-4 text-left pb-1 pt-2">Rua das Flores, 123</h3>
                    <p className="text-slate-500 dark:text-white/60 text-base font-normal leading-normal pb-3 px-4">Bairro Central - São Paulo, SP</p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-stretch">
                    <div className="flex flex-1 gap-3 px-4 py-4 justify-between">
                        <button className="flex flex-1 min-w-[140px] cursor-pointer items-center justify-center gap-2 rounded-xl h-14 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white text-base font-bold leading-normal transition-colors active:scale-95">
                            <MaterialIcon name="call" />
                            <span className="truncate">Ligar</span>
                        </button>
                        <button className="flex flex-1 min-w-[140px] cursor-pointer items-center justify-center gap-2 rounded-xl h-14 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white text-base font-bold leading-normal transition-colors active:scale-95">
                            <MaterialIcon name="map" />
                            <span className="truncate">Ver Mapa</span>
                        </button>
                    </div>
                </div>

                {/* Observations Card */}
                <div className="px-4 py-4">
                    <div className="bg-[#13ec6d]/10 border border-[#13ec6d]/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MaterialIcon name="sticky_note_2" className="text-[#13ec6d] text-xl" />
                            <p className="text-[#13ec6d] font-bold text-sm uppercase tracking-wider">Observações do Pedido</p>
                        </div>
                        <p className="text-slate-800 dark:text-white/90 text-lg leading-relaxed font-medium italic">
                            "Deixar na portaria com o porteiro Sr. Carlos. O interfone está com defeito."
                        </p>
                    </div>
                </div>

                {/* Items Summary */}
                <div className="px-4 py-4 mb-24">
                    <p className="text-slate-400 dark:text-white/40 font-bold text-xs uppercase tracking-widest mb-4">Resumo da Entrega</p>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white dark:bg-transparent p-3 rounded-lg dark:p-0">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/60">
                                    <MaterialIcon name="medication" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Amoxicilina 500mg</p>
                                    <p className="text-xs text-slate-400 dark:text-white/40">1 unidade</p>
                                </div>
                            </div>
                            {/* <span className="font-bold text-[#13ec6d]">R$ 45,90</span> - Hidden per guidelines */}
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-transparent p-3 rounded-lg dark:p-0">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/60">
                                    <MaterialIcon name="payments" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Forma de Pagamento</p>
                                    <p className="text-xs text-slate-400 dark:text-white/40">Pago via App</p>
                                </div>
                            </div>
                            <MaterialIcon name="check_circle" className="text-[#13ec6d]" />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/80 dark:bg-[#102218]/80 backdrop-blur-md border-t border-gray-200 dark:border-white/5">
                <Link to="/motoboy-route-status" className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-16 bg-[#13ec6d] text-[#102218] text-lg font-black leading-normal tracking-wide uppercase active:scale-[0.98] transition-transform shadow-lg shadow-[#13ec6d]/20 hover:bg-[#13ec6d]/90">
                    <span className="truncate">Atualizar Status</span>
                </Link>
            </div>
        </div>
    );
};

export default MotoboyDeliveryDetail;
