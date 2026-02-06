import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../../components/Shared';

export const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-background-dark overflow-x-hidden font-display">
            {/* Navbar */}
            <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <MaterialIcon name="medication" className="text-background-dark font-black" />
                    </div>
                    <span className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">Ifarma</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
                    >
                        Entrar
                    </button>
                    <button
                        onClick={() => navigate('/signup')}
                        className="bg-primary text-background-dark px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                    >
                        Criar Conta
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6 pt-12 pb-24 grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8 animate-fade-in">
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Disponível agora em sua região</span>
                    </div>

                    <h1 className="text-6xl md:text-7xl font-black italic text-slate-900 dark:text-white leading-[0.9] tracking-tighter">
                        Sua saúde <br />
                        <span className="text-primary">em minutos.</span>
                    </h1>

                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
                        Esqueça as filas. Com o Ifarma, você compra seus medicamentos e produtos de higiene de forma rápida, segura e com entrega garantida na sua porta.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => navigate('/pharmacies')}
                            className="flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all"
                        >
                            <MaterialIcon name="explore" />
                            Explorar Farmácias
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="flex items-center justify-center gap-3 bg-primary text-background-dark px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all"
                        >
                            <MaterialIcon name="app_registration" />
                            Começar agora
                        </button>
                    </div>

                    <div className="flex items-center gap-6 pt-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} className="size-10 rounded-full border-4 border-white dark:border-background-dark object-cover" />
                            ))}
                        </div>
                        <p className="text-xs font-bold text-slate-400">
                            <span className="text-slate-900 dark:text-white font-black">+5.000 usuários</span> já confiam no Ifarma
                        </p>
                    </div>
                </div>

                <div className="relative flex justify-center lg:justify-end animate-fade-in-up">
                    <div className="relative z-10 w-full max-w-[320px] aspect-[9/18.5] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden scale-110">
                        {/* Mockup screen content */}
                        <div className="w-full h-full bg-white dark:bg-zinc-950 flex flex-col pt-8 p-4">
                            <div className="size-10 bg-primary/10 rounded-xl mb-4 flex items-center justify-center">
                                <MaterialIcon name="medication" className="text-primary" />
                            </div>
                            <div className="h-4 w-1/2 bg-slate-100 dark:bg-zinc-800 rounded-full mb-2"></div>
                            <div className="h-3 w-3/4 bg-slate-50 dark:bg-zinc-900 rounded-full mb-8"></div>

                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-square bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5 p-3 flex flex-col justify-end">
                                        <div className="size-8 bg-white dark:bg-zinc-800 rounded-lg mb-auto"></div>
                                        <div className="h-2 w-full bg-slate-200 dark:bg-zinc-700 rounded-full mb-1"></div>
                                        <div className="h-2 w-1/2 bg-primary/30 rounded-full"></div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 rounded-3xl bg-primary text-black flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Pedido em rota</p>
                                    <p className="text-xs font-black italic">Chega em 12 min</p>
                                </div>
                                <MaterialIcon name="moped" fill />
                            </div>
                        </div>
                    </div>

                    {/* Floating decorations */}
                    <div className="absolute -top-10 -right-10 size-32 bg-primary/20 blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-10 -left-10 size-40 bg-blue-500/10 blur-3xl animate-pulse delay-700"></div>
                </div>
            </main>

            {/* Features section */}
            <section className="bg-slate-50 dark:bg-black/20 py-24 border-y border-slate-100 dark:border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-4xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Ecosistema Completo</h2>
                        <p className="font-medium text-slate-500 dark:text-slate-400">Uma plataforma pensada para todos os envolvidos no processo de cuidado com a saúde.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: 'person',
                                title: 'Para Pacientes',
                                desc: 'Compre em segundos, envie receitas e rastreie sua entrega em tempo real no mapa.',
                                color: 'bg-blue-500'
                            },
                            {
                                icon: 'storefront',
                                title: 'Para Farmácias',
                                desc: 'Painel de gestão completo, controle de estoque e automação de mensagens para vender mais.',
                                color: 'bg-primary'
                            },
                            {
                                icon: 'moped',
                                title: 'Para Entregadores',
                                desc: 'App dedicado com rotas inteligentes e gestão simplificada de ganhos por entrega.',
                                color: 'bg-emerald-500'
                            }
                        ].map((feat, i) => (
                            <div key={i} className="group bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all hover:scale-[1.02]">
                                <div className={`size-14 ${feat.color} text-background-dark rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-${feat.color.split('-')[1]}-500/20 group-hover:rotate-12 transition-transform`}>
                                    <MaterialIcon name={feat.icon} className="text-2xl" fill />
                                </div>
                                <h3 className="text-xl font-black italic text-slate-900 dark:text-white uppercase tracking-tight mb-3">{feat.title}</h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-slate-900 dark:bg-white rounded-[60px] p-12 md:p-20 text-center relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-black italic text-white dark:text-slate-900 leading-tight uppercase tracking-tighter mb-8">
                                Pronto para digitalizar <br />
                                a sua farmácia?
                            </h2>
                            <button
                                onClick={() => navigate('/partner/register')}
                                className="bg-primary text-background-dark px-10 py-5 rounded-3xl font-black text-base uppercase tracking-widest shadow-2xl shadow-primary/40 hover:scale-105 transition-all"
                            >
                                Seja um Parceiro
                            </button>
                        </div>

                        {/* Abstract background elements */}
                        <div className="absolute top-0 right-0 size-64 bg-primary/20 blur-[100px] -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 size-64 bg-blue-500/20 blur-[100px] -ml-32 -mb-32"></div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-100 dark:border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center">
                            <MaterialIcon name="medication" className="text-primary text-sm" />
                        </div>
                        <span className="text-base font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">Ifarma</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Design with ❤️ for health. © 2026 Ifarma Technologies.
                    </p>
                    <div className="flex gap-6">
                        <MaterialIcon name="facebook" className="text-slate-400 hover:text-primary cursor-pointer" />
                        <span className="material-symbols-outlined text-slate-400 hover:text-primary cursor-pointer">chat</span>
                        <MaterialIcon name="alternate_email" className="text-slate-400 hover:text-primary cursor-pointer" />
                    </div>
                </div>
            </footer>
        </div>
    );
};
