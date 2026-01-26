import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const MotoboyRouteStatus = () => {
    const navigate = useNavigate();

    // Custom theme constants
    const routeTheme = {
        '--route-primary': '#13ec6d',
        '--route-bg-dark': '#102218',
        '--route-card-bg': '#193324',
        '--route-text-light': '#92c9a9',
    } as React.CSSProperties;

    return (
        <div className="bg-background-light dark:bg-[#102218] text-white min-h-screen flex flex-col font-display transition-colors duration-200" style={routeTheme}>
            {/* TopAppBar */}
            <header className="sticky top-0 z-50 bg-background-light dark:bg-[#102218]/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer active:scale-90 transition-transform"
                    >
                        <MaterialIcon name="arrow_back_ios" />
                    </button>
                    <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Pedido #4092</h2>
                    <div className="flex w-12 items-center justify-end">
                        <button className="flex items-center justify-center rounded-lg h-12 bg-transparent text-slate-900 dark:text-white p-0">
                            <MaterialIcon name="info" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-md mx-auto w-full">
                {/* Headline and Steps Section */}
                <div className="pt-6 px-4">
                    <h3 className="text-slate-900 dark:text-white tracking-tight text-2xl font-bold leading-tight text-center pb-4">
                        Em rota de entrega
                    </h3>
                    {/* PageIndicators / Step Progress */}
                    <div className="flex w-full flex-row items-center justify-center gap-4 py-2">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-2.5 w-16 rounded-full bg-[#13ec6d] shadow-[0_0_10px_rgba(19,236,109,0.5)]"></div>
                            <span className="text-[10px] font-bold text-[#13ec6d] uppercase tracking-wider">Em Rota</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-2.5 w-16 rounded-full bg-slate-300 dark:bg-[#326748]"></div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-[#92c9a9] uppercase tracking-wider">Entregue</span>
                        </div>
                    </div>
                </div>

                {/* Map Section */}
                <div className="flex px-4 py-6 flex-1 min-h-[300px]">
                    <div className="relative w-full h-full min-h-[300px] bg-slate-200 dark:bg-[#193324] rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10">
                        {/* Map Background */}
                        <div
                            className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-80"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDqlNyZqUrNZi6B58XlpURJIArhnB4RbjO4PAO840CVbYKVV8xEUqOZePElB0IxeJ4GjzK6yqNSBc8k4ybt-dCMqF2GwURj1hsJUVElu_EuQSCbcMjxX4bYf04CiPMzpZF362W-4ChtsvkIGDc81WDW6pavg3GZf0d7dafvtt-P-9OuyZPGvh9e0kvEsov0F5gsfm6U4mue1pW89QWC_QlD3KBbVzqGL2EFsI4zvdOQk7Bzqs0MrlqTXeTomkK_Fj5NGEazR6zviw")' }}
                        >
                        </div>

                        {/* Map Overlay Elements */}
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-[#102218]/80 backdrop-blur-md p-2 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
                            <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] uppercase font-bold">Chegada em</p>
                            <p className="text-slate-900 dark:text-white font-bold text-lg">4 min</p>
                        </div>

                        {/* Destination Marker */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                            <div className="bg-[#13ec6d] text-[#102218] p-2 rounded-full shadow-lg animate-pulse">
                                <MaterialIcon name="location_on" className="!text-3xl font-bold" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delivery Card Section */}
                <div className="p-4 pb-0">
                    <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-[#193324] p-5 shadow-xl border border-gray-100 dark:border-white/5">
                        <div className="flex flex-col gap-1 flex-[2_2_0px]">
                            <p className="text-slate-500 dark:text-[#92c9a9] text-xs font-bold leading-normal uppercase tracking-widest">Destinatário</p>
                            <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Ana Beatriz Ferreira</p>
                            <div className="flex items-start gap-1 mt-1">
                                <MaterialIcon name="near_me" className="text-slate-400 dark:text-[#92c9a9] !text-sm mt-0.5" />
                                <p className="text-slate-500 dark:text-[#92c9a9] text-sm font-medium leading-tight">Av. Paulista, 1578 - Ap 42<br />Bela Vista, SP</p>
                            </div>
                        </div>
                        <div
                            className="w-20 h-20 bg-center bg-no-repeat bg-cover rounded-lg flex-none border border-gray-200 dark:border-white/10"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAKj6N3QcumXniLLOz6gmhyDG-0zavYEjfIpWJ1Zifnu69LlbBRdufIhRx3OiRFWwX54rJlJxv11RU0dLor3eK_ew6XJztMOvsIt8eGX_VtPy8e1QqgC4FicLN0DjMOKTWMDQ1OZflDvhztFA0tpHdHkOucpTZ5H1dvMnPg9zn6ldiyqdyQ0uRY14-blPmdp2BEryuGjnA3bllls0_QLkMNziqFBzccbErJylyKXR1c5JgHzBKIp7hmCim-gi50Ba11Hf6XK2YFLg")' }}
                        >
                        </div>
                    </div>
                </div>

                {/* Sticky Action Button Container */}
                <div className="p-4 mt-auto">
                    <Link
                        to="/motoboy-delivery-confirm"
                        className="w-full bg-[#13ec6d] hover:bg-[#11d662] active:scale-[0.98] transition-all text-[#102218] h-16 rounded-xl flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(19,236,109,0.3)]"
                    >
                        <span className="text-xl font-black uppercase tracking-tight">Confirmar Entrega</span>
                        <MaterialIcon name="check_circle" className="font-bold" />
                    </Link>
                    <div className="h-6"></div> {/* Safe area spacing */}
                </div>
            </main>
        </div>
    );
};

export default MotoboyRouteStatus;
