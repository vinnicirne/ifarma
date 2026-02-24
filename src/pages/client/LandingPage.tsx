import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../../components/Shared';

export const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-background-dark overflow-x-hidden font-display">
            {/* Navbar - Foco em B2B */}
            <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <MaterialIcon name="leaderboard" className="text-background-dark font-black" />
                    </div>
                    <span className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">Ifarma Gestor</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
                    >
                        Entrar
                    </button>
                    <button
                        onClick={() => navigate('/partner/register')}
                        className="bg-primary text-background-dark px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                    >
                        Seja um Parceiro
                    </button>
                </div>
            </nav>

            {/* Hero Section - Foco em Dor e Ganho */}
            <main className="max-w-7xl mx-auto px-6 pt-12 pb-24 grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8 animate-fade-in">
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Aumente sua produtividade em até 40%</span>
                    </div>

                    <h1 className="text-6xl md:text-7xl font-black italic text-slate-900 dark:text-white leading-[0.9] tracking-tighter uppercase">
                        Venda mais, <br />
                        <span className="text-primary">atenda menos.</span>
                    </h1>

                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
                        Pare de perder vendas no gargalo do WhatsApp. Automatize seu delivery, gerencie seus motoboys em tempo real e transforme sua farmácia em uma operação digital de alta performance.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => navigate('/partner/register')}
                            className="flex items-center justify-center gap-3 bg-primary text-background-dark px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all"
                        >
                            <MaterialIcon name="rocket_launch" />
                            Digitalizar Minha Loja Agora
                        </button>
                        <button
                            onClick={() => navigate('/pharmacies')}
                            className="flex items-center justify-center gap-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Ver App do Cliente
                        </button>
                    </div>

                    <div className="flex items-center gap-6 pt-4">
                        <p className="text-xs font-bold text-slate-400">
                            <span className="text-slate-900 dark:text-white font-black">+100 farmácias</span> já automatizaram seus processos
                        </p>
                    </div>
                </div>

                {/* Mockup do Painel Gestor */}
                <div className="relative flex justify-center lg:justify-end animate-fade-in-up">
                    <div className="relative z-10 w-full max-w-[450px] aspect-video bg-slate-900 rounded-[2rem] border-8 border-slate-800 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden">
                        <div className="w-full h-full bg-zinc-950 p-6">
                            <div className="flex justify-between mb-8">
                                <div className="h-4 w-32 bg-primary/20 rounded-full"></div>
                                <div className="h-4 w-8 bg-zinc-800 rounded-full"></div>
                            </div>
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="p-4 bg-zinc-900 rounded-xl border border-white/5 flex items-center justify-between">
                                        <div className="flex gap-4">
                                            <div className="size-8 bg-zinc-800 rounded-lg"></div>
                                            <div className="space-y-2">
                                                <div className="h-2 w-24 bg-zinc-700 rounded-full"></div>
                                                <div className="h-2 w-16 bg-primary/30 rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="h-6 w-20 bg-primary/20 border border-primary/30 rounded-full"></div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 flex gap-4">
                                <div className="flex-1 h-20 bg-primary/10 rounded-2xl border border-primary/20 p-4">
                                    <div className="h-2 w-12 bg-primary/40 rounded-full mb-2"></div>
                                    <div className="h-4 w-20 bg-primary rounded-full"></div>
                                </div>
                                <div className="flex-1 h-20 bg-zinc-900 rounded-2xl border border-white/5 p-4">
                                    <div className="h-2 w-12 bg-white/20 rounded-full mb-2"></div>
                                    <div className="h-4 w-20 bg-white/40 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute -top-10 -right-10 size-32 bg-primary/20 blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-10 -left-10 size-40 bg-blue-500/10 blur-3xl animate-pulse delay-700"></div>
                </div>
            </main>

            {/* Módulos do Gestor */}
            <section className="bg-slate-50 dark:bg-black/20 py-24 border-y border-slate-100 dark:border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-4xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Tecnologia que Gera Lucro</h2>
                        <p className="font-medium text-slate-500 dark:text-slate-400">Desenvolvemos as ferramentas que o dono de farmácia precisa para crescer de forma sustentável.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        <div className="group bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all">
                            <div className="size-16 bg-primary text-background-dark rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-primary/20 group-hover:rotate-6 transition-transform">
                                <MaterialIcon name="bolt" className="text-3xl" fill />
                            </div>
                            <h3 className="text-2xl font-black italic text-slate-900 dark:text-white uppercase tracking-tight mb-4">WhatsApp Killer</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Libere seus balconistas do atendimento manual. Com pedidos automáticos, você elimina erros de digitação e reduz o tempo de atendimento de <b>10 minutos para 30 segundos</b> por pedido.</p>
                        </div>
                        <div className="group bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all">
                            <div className="size-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20 group-hover:-rotate-6 transition-transform">
                                <MaterialIcon name="moped" className="text-3xl" fill />
                            </div>
                            <h3 className="text-2xl font-black italic text-slate-900 dark:text-white uppercase tracking-tight mb-4">Logística Pro</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Controle total sobre seus motoboys próprios. Rastreamento em tempo real no mapa, cálculo de rotas otimizado e prova de entrega digital por cada pedido finalizado.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-slate-900 dark:bg-white rounded-[60px] p-12 md:p-20 text-center relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-black italic text-white dark:text-slate-900 leading-tight uppercase tracking-tighter mb-8">
                                O mercado mudou. <br />
                                Sua farmácia vai ficar pra trás?
                            </h2>
                            <button
                                onClick={() => navigate('/partner/register')}
                                className="bg-primary text-background-dark px-12 py-6 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-primary/40 hover:scale-105 transition-all"
                            >
                                Quero Ser Parceiro Agora
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 size-64 bg-primary/20 blur-[100px] -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 size-64 bg-blue-500/20 blur-[100px] -ml-32 -mb-32"></div>
                    </div>
                </div>
            </section>

            {/* Footer Minimalista */}
            <footer className="border-t border-slate-100 dark:border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center">
                            <MaterialIcon name="leaderboard" className="text-primary text-sm" />
                        </div>
                        <span className="text-base font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">Ifarma Gestor</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        A plataforma definitiva para o crescimento da sua farmácia.
                    </p>
                    <div className="flex gap-6">
                        <MaterialIcon name="alternate_email" className="text-slate-400 hover:text-primary cursor-pointer" />
                        <MaterialIcon name="help" className="text-slate-400 hover:text-primary cursor-pointer" />
                    </div>
                </div>
            </footer>
        </div>
    );
};
