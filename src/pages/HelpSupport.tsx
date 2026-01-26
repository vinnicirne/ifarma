
import { useNavigate, Link } from 'react-router-dom';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const HelpSupport = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen pb-24 font-display transition-colors duration-200">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
                <div className="h-[44px]"></div> {/* iOS Status Bar placeholder */}
                <div className="flex items-center px-4 py-2 justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex size-10 items-center justify-start cursor-pointer active:scale-95 transition-transform"
                    >
                        <MaterialIcon name="chevron_left" />
                    </button>
                    <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Ajuda e Suporte</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto">
                {/* Search Bar Section */}
                <div className="px-4 py-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                            <MaterialIcon name="search" className="text-[22px]" />
                        </div>
                        <input
                            className="w-full h-14 bg-white dark:bg-[#33191e] border-none rounded-xl pl-12 pr-4 text-base focus:ring-2 focus:ring-primary shadow-sm placeholder:text-slate-400 dark:placeholder:text-[#c9929b]/60 transition-all outline-none"
                            placeholder="Como podemos ajudar?"
                            type="text"
                        />
                    </div>
                </div>

                {/* Quick Categories */}
                <section className="mt-2">
                    <h3 className="text-lg font-bold px-4 mb-4">Categorias comuns</h3>
                    <div className="grid grid-cols-2 gap-3 px-4">
                        {[
                            { icon: 'shopping_bag', label: 'Pedidos' },
                            { icon: 'credit_card', label: 'Pagamentos' },
                            { icon: 'description', label: 'Receitas' },
                            { icon: 'local_shipping', label: 'Entregas' }
                        ].map((cat, i) => (
                            <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-[#67323b] bg-white dark:bg-[#33191e] p-5 items-start cursor-pointer hover:border-primary transition-colors group">
                                <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:scale-110 transition-transform">
                                    <MaterialIcon name={cat.icon} />
                                </div>
                                <span className="text-sm font-semibold">{cat.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="mt-8">
                    <h3 className="text-lg font-bold px-4 mb-4">Perguntas frequentes</h3>
                    <div className="flex flex-col space-y-1 px-4">
                        {[
                            { id: 'faq-1', q: 'Onde está meu pedido?', a: 'Você pode acompanhar o status em tempo real na aba "Meus Pedidos". Assim que o entregador sair da farmácia, você receberá uma notificação.' },
                            { id: 'faq-2', q: 'Como enviar minha receita digital?', a: 'Ao selecionar um medicamento que exige receita, clique no botão "Anexar Receita". Aceitamos fotos nítidas ou arquivos PDF originais.' },
                            { id: 'faq-3', q: 'Quais são as formas de pagamento?', a: 'Aceitamos Cartões de Crédito, Débito, PIX e pagamento direto no ato da entrega (verifique a disponibilidade da farmácia).' },
                            { id: 'faq-4', q: 'Prazo de entrega e frete', a: 'O prazo médio é de 30 a 60 minutos para entregas expressas. O valor do frete varia de acordo com a distância entre você e a farmácia escolhida.' }
                        ].map((faq) => (
                            <div key={faq.id} className="border-b border-slate-100 dark:border-[#482329]">
                                <details className="group">
                                    <summary className="flex justify-between items-center py-5 cursor-pointer list-none">
                                        <span className="text-[15px] font-medium group-hover:text-primary transition-colors">{faq.q}</span>
                                        <span className="text-slate-400 transition-transform group-open:rotate-180">
                                            <MaterialIcon name="expand_more" />
                                        </span>
                                    </summary>
                                    <div className="pb-5 text-sm text-slate-500 dark:text-[#c9929b] leading-relaxed animate-fadeIn">
                                        {faq.a}
                                    </div>
                                </details>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Help Prompt */}
                <div className="mt-8 px-4 text-center">
                    <p className="text-sm text-slate-400 dark:text-[#c9929b] mb-2">Ainda precisa de ajuda?</p>
                    <p className="text-sm font-semibold">Nossa equipe está disponível 24/7 para você.</p>
                </div>
            </main>

            {/* Floating Action Button */}
            <button className="fixed bottom-24 right-6 flex items-center gap-2 bg-primary hover:bg-red-700 text-white px-5 py-4 rounded-full shadow-2xl shadow-primary/40 active:scale-95 transition-all z-40">
                <MaterialIcon name="chat_bubble" className="text-[24px]" />
                <span className="font-bold text-sm">Falar com Atendente</span>
            </button>

            {/* Bottom Tab Bar (iOS style) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 px-6 pb-8 pt-3 flex justify-between items-center z-40">
                <Link to="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <MaterialIcon name="home" />
                    <span className="text-[10px]">Início</span>
                </Link>
                <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <MaterialIcon name="search" />
                    <span className="text-[10px]">Buscar</span>
                </button>
                <Link to="/orders" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <MaterialIcon name="receipt_long" />
                    <span className="text-[10px]">Pedidos</span>
                </Link>
                <Link to="/help" className="flex flex-col items-center gap-1 text-primary">
                    <MaterialIcon name="help" className="fill-[1]" />
                    <span className="text-[10px] font-medium">Ajuda</span>
                </Link>
                <Link to="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <MaterialIcon name="person" />
                    <span className="text-[10px]">Perfil</span>
                </Link>
            </nav>

            {/* Home Indicator (iOS) */}
            <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full pointer-events-none z-[60]"></div>
        </div>
    );
};

export default HelpSupport;
