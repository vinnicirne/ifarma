
import { useNavigate, Link } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const UserProfile = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col font-display transition-colors duration-200">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-background-light dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
                    >
                        <MaterialIcon name="arrow_back_ios_new" className="text-slate-900 dark:text-white" />
                    </button>
                    <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Perfil</h1>
                    <div className="flex w-10 items-center justify-end">
                        <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-95">
                            <MaterialIcon name="settings" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-md mx-auto w-full pb-24">
                {/* Profile Header Section */}
                <section className="flex flex-col items-center py-8 px-4">
                    <div className="relative">
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-4 border-primary/20 shadow-lg"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCmcBHZXw7Z7mdphm0StiNKXzHnW640y7g2apMvgmUSgSusLkHLwqYeFopfIU_GppWCsPZsK-z_ga9_S8coYeQT-1NToBchEWrby3CwmXK0MF24IcLgcySZ_BfJyZHxhj9ibIoNCiFskFfwAtxCx6qFRII5lBiebK7cG_Wdx0VRNLYCxeJoI3wi8-HmmKuVm5bNvvaCzgbjCv8fZlQT3kicskzI1kGOxZlsDyj5qfSrsp-dMy8RA6tWRpqdmaOrxkQTa9UcryTLow")' }}
                        >
                        </div>
                        <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-background-dark hover:bg-primary/90 transition-colors active:scale-95">
                            <MaterialIcon name="edit" className="text-sm" />
                        </button>
                    </div>
                    <div className="mt-4 flex flex-col items-center">
                        <h2 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-tight">João Silva</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Membro desde Outubro 2023</p>
                        <p className="text-primary text-sm font-semibold mt-0.5">joaosilva@email.com</p>
                    </div>
                </section>

                {/* Addresses Section */}
                <section className="mt-4">
                    <div className="flex items-center justify-between px-4 mb-2">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Meus Endereços</h3>
                        <button className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity">Adicionar</button>
                    </div>
                    <div className="space-y-1">
                        {/* ListItem Home */}
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 px-4 min-h-[72px] py-2 justify-between cursor-pointer active:bg-slate-100 dark:active:bg-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70">
                            <div className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-xl bg-primary/10 shrink-0 size-12">
                                    <MaterialIcon name="home" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <p className="text-slate-900 dark:text-white text-base font-semibold leading-normal line-clamp-1">Casa</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal line-clamp-1">Rua das Flores, 123 - São Paulo</p>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <MaterialIcon name="chevron_right" className="text-slate-400 dark:text-slate-600" />
                            </div>
                        </div>
                        {/* ListItem Work */}
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 px-4 min-h-[72px] py-2 justify-between cursor-pointer active:bg-slate-100 dark:active:bg-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70">
                            <div className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-xl bg-primary/10 shrink-0 size-12">
                                    <MaterialIcon name="work" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <p className="text-slate-900 dark:text-white text-base font-semibold leading-normal line-clamp-1">Trabalho</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal line-clamp-1">Av. Paulista, 1000 - Bela Vista</p>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <MaterialIcon name="chevron_right" className="text-slate-400 dark:text-slate-600" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Prescription History */}
                <section className="mt-8">
                    <div className="flex items-center justify-between px-4 mb-4">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Histórico de Receitas</h3>
                        <span className="text-primary text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity">Ver tudo</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
                        {/* Recipe Card 1 */}
                        <div className="flex-none w-40 flex flex-col gap-2 cursor-pointer group/card">
                            <div className="aspect-[3/4] w-full bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 text-white">
                                    <MaterialIcon name="visibility" />
                                </div>
                                <div className="h-full w-full bg-slate-100 dark:bg-slate-700/50 flex flex-col p-3 group-hover/card:scale-105 transition-transform duration-300">
                                    <MaterialIcon name="description" className="text-primary mb-2" />
                                    <div className="h-1 w-2/3 bg-slate-300 dark:bg-slate-600 rounded mb-1"></div>
                                    <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded mb-1"></div>
                                    <div className="h-1 w-1/2 bg-slate-300 dark:bg-slate-600 rounded"></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-900 dark:text-white text-sm font-semibold truncate group-hover/card:text-primary transition-colors">Receita Médica</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">12 Out 2023</p>
                            </div>
                        </div>
                        {/* Recipe Card 2 */}
                        <div className="flex-none w-40 flex flex-col gap-2 cursor-pointer group/card">
                            <div className="aspect-[3/4] w-full bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 text-white">
                                    <MaterialIcon name="visibility" />
                                </div>
                                <div className="h-full w-full bg-slate-100 dark:bg-slate-700/50 flex flex-col p-3 group-hover/card:scale-105 transition-transform duration-300">
                                    <MaterialIcon name="description" className="text-primary mb-2" />
                                    <div className="h-1 w-3/4 bg-slate-300 dark:bg-slate-600 rounded mb-1"></div>
                                    <div className="h-1 w-1/3 bg-slate-300 dark:bg-slate-600 rounded mb-1"></div>
                                    <div className="h-1 w-2/3 bg-slate-300 dark:bg-slate-600 rounded"></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-900 dark:text-white text-sm font-semibold truncate group-hover/card:text-primary transition-colors">Pedido 0482</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">28 Set 2023</p>
                            </div>
                        </div>
                        {/* Recipe Card 3 */}
                        <div className="flex-none w-40 flex flex-col gap-2 cursor-pointer group/card">
                            <div className="aspect-[3/4] w-full bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 text-white">
                                    <MaterialIcon name="visibility" />
                                </div>
                                <div className="h-full w-full bg-slate-100 dark:bg-slate-700/50 flex flex-col p-3 group-hover/card:scale-105 transition-transform duration-300">
                                    <MaterialIcon name="description" className="text-primary mb-2" />
                                    <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded mb-1"></div>
                                    <div className="h-1 w-2/3 bg-slate-300 dark:bg-slate-600 rounded"></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-900 dark:text-white text-sm font-semibold truncate group-hover/card:text-primary transition-colors">Exame Sangue</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">05 Ago 2023</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Personal Data Section */}
                <section className="mt-8">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight px-4 mb-2">Dados Pessoais</h3>
                    <div className="space-y-1">
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 px-4 min-h-[64px] py-2 justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                                    <MaterialIcon name="person" className="text-[20px]" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-900 dark:text-white text-sm font-medium">Nome Completo</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">João da Silva Santos</p>
                                </div>
                            </div>
                            <MaterialIcon name="chevron_right" className="text-slate-400 text-[20px]" />
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 px-4 min-h-[64px] py-2 justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                                    <MaterialIcon name="badge" className="text-[20px]" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-900 dark:text-white text-sm font-medium">CPF</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">***.482.***-00</p>
                                </div>
                            </div>
                            <MaterialIcon name="lock" className="text-slate-400 text-[20px]" />
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 px-4 min-h-[64px] py-2 justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                                    <MaterialIcon name="phone" className="text-[20px]" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-900 dark:text-white text-sm font-medium">Celular</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">(11) 98765-4321</p>
                                </div>
                            </div>
                            <MaterialIcon name="chevron_right" className="text-slate-400 text-[20px]" />
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="mt-12 px-4">
                    <button className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-xl font-bold transition-colors active:scale-98">
                        <MaterialIcon name="logout" />
                        Sair da Conta
                    </button>
                    <p className="text-center text-slate-500 dark:text-slate-600 text-xs mt-6">Versão 2.4.12 - PharmaMarket iOS</p>
                </section>
            </main>

            {/* Bottom Navigation Bar (iOS Style) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe shadow-2xl z-50">
                <div className="max-w-md mx-auto flex justify-around items-center h-16">
                    <Link to="/" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary transition-colors">
                        <MaterialIcon name="home" />
                        <span className="text-[10px] font-medium">Início</span>
                    </Link>
                    <button className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary transition-colors">
                        <MaterialIcon name="search" />
                        <span className="text-[10px] font-medium">Busca</span>
                    </button>
                    <Link to="/cart" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary transition-colors">
                        <MaterialIcon name="shopping_cart" />
                        <span className="text-[10px] font-medium">Carrinho</span>
                    </Link>
                    <Link to="/orders" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary transition-colors">
                        <MaterialIcon name="receipt_long" />
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </Link>
                    <Link to="/profile" className="flex flex-col items-center gap-0.5 text-primary">
                        <MaterialIcon name="person" style={{ fontVariationSettings: "'FILL' 1" }} />
                        <span className="text-[10px] font-medium">Perfil</span>
                    </Link>
                </div>
                {/* iOS Home Indicator Space */}
                <div className="h-6 w-full pointer-events-none"></div>
            </nav>
        </div>
    );
};

export default UserProfile;
