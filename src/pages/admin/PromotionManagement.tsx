import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../../components/Shared';

export const PromotionManagement = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col gap-6">
            {/* Universal Header */}
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Promoções</h1>
                <div className="flex gap-3">
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-10 px-4 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all">
                        <MaterialIcon name="history" className="text-primary" />
                        <span className="hidden md:inline">Histórico</span>
                    </button>
                    <button className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest">
                        <MaterialIcon name="rocket_launch" />
                        <span className="hidden md:inline">Nova Campanha</span>
                    </button>
                </div>
            </header>

            {/* Mobile Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-[#326748]/30 md:hidden">
                <div className="flex items-center p-4 justify-between w-full">
                    <button onClick={() => navigate(-1)} className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer active:scale-90">
                        <MaterialIcon name="arrow_back_ios_new" />
                    </button>
                    <h2 className="text-white text-lg font-black leading-tight tracking-tighter flex-1 text-center italic">Gestão de Promoções</h2>
                    <div className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer">
                        <MaterialIcon name="more_horiz" />
                    </div>
                </div>
            </header>

            <main className="pb-32 md:pb-10 p-4 md:p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Create Campaign Column */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-24">
                            <div className="px-1 md:hidden">
                                <h2 className="text-white text-[22px] font-black leading-tight tracking-tighter pt-5 pb-2 italic">Nova Campanha</h2>
                                <p className="text-[#92c9a9] text-sm font-medium mb-4 italic opacity-70">Preencha os detalhes para lança uma nova oferta na rede.</p>
                            </div>

                            {/* Campaign Form Container */}
                            <div className="bg-[#193324]/30 border border-[#326748]/50 rounded-[32px] overflow-hidden shadow-xl md:bg-white md:dark:bg-[#193324] md:border-slate-200 md:dark:border-white/5">
                                <div className="hidden md:block p-6 border-b border-black/5 dark:border-white/5">
                                    <h2 className="text-slate-900 dark:text-white text-xl font-black italic">Nova Campanha</h2>
                                    <p className="text-slate-500 dark:text-[#92c9a9] text-xs font-bold mt-1">Configure o lançamento</p>
                                </div>

                                <div className="flex flex-col gap-4 p-5 md:p-6">
                                    {/* Name Field */}
                                    <label className="flex flex-col w-full">
                                        <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Nome da Campanha</p>
                                        <input className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 focus:border-primary h-14 placeholder:text-[#92c9a9]/30 md:placeholder:text-slate-400 p-4 text-base font-bold italic transition-all shadow-sm" placeholder="Ex: Black Friday Farmácias" />
                                    </label>

                                    {/* Dates Row */}
                                    <div className="flex gap-4">
                                        <label className="flex flex-col flex-1">
                                            <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Data Início</p>
                                            <input className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 h-14 p-4 text-sm font-bold focus:ring-primary/20 focus:border-primary shadow-sm" type="date" />
                                        </label>
                                        <label className="flex flex-col flex-1">
                                            <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Data Fim</p>
                                            <input className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 h-14 p-4 text-sm font-bold focus:ring-primary/20 focus:border-primary shadow-sm" type="date" />
                                        </label>
                                    </div>

                                    {/* Banner Upload */}
                                    <div className="flex flex-col w-full">
                                        <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Banner da Campanha</p>
                                        <div className="relative group cursor-pointer border-2 border-dashed border-[#326748] md:border-slate-300 md:dark:border-white/10 rounded-3xl bg-[#193324]/30 md:bg-slate-50 md:dark:bg-black/20 flex flex-col items-center justify-center p-8 transition-all hover:bg-[#193324]/50 md:hover:bg-slate-100 md:dark:hover:bg-black/30 hover:border-primary/50 shadow-inner">
                                            <MaterialIcon name="cloud_upload" className="text-primary text-4xl mb-2 group-hover:scale-110 transition-transform" />
                                            <p className="text-[10px] font-black text-[#92c9a9] md:text-slate-400 uppercase tracking-widest text-center">Selecionar Imagem</p>
                                        </div>
                                    </div>

                                    {/* Participating Pharmacies */}
                                    <div className="flex flex-col w-full">
                                        <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Farmácias Participantes</p>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-sm">
                                                Todas as Farmácias
                                                <MaterialIcon name="close" className="text-[14px] cursor-pointer hover:rotate-90 transition-transform" />
                                            </span>
                                            <button className="flex items-center gap-1 px-4 py-2 border border-[#326748] md:border-slate-300 md:dark:border-white/10 rounded-full text-[#92c9a9] md:text-slate-500 text-[10px] font-black uppercase tracking-widest hover:border-primary transition-colors italic">
                                                <MaterialIcon name="add" className="text-[14px]" />
                                                Adicionar Grupo
                                            </button>
                                        </div>
                                    </div>

                                    {/* Create Button */}
                                    <button className="w-full bg-primary text-background-dark font-black py-4 rounded-3xl shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 uppercase tracking-tighter text-sm">
                                        <MaterialIcon name="rocket_launch" className="hover:rotate-12 transition-transform" />
                                        Criar Promoção
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active List Column */}
                    <div className="flex-1">
                        <div className="h-4 bg-black/20 my-4 shadow-inner md:hidden"></div>

                        <div className="px-1 pb-4">
                            <div className="flex justify-between items-center mb-6 pt-4 md:pt-0">
                                <h2 className="text-white md:text-slate-900 md:dark:text-white text-xl font-black tracking-tighter italic">Promoções Ativas</h2>
                                <span className="bg-primary/10 text-primary text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest italic border border-primary/20">04 Ativas</span>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {[
                                    { title: "Festival de Verão", date: "30 Dez, 2023", reach: "12 Lojas", icon: "sunny" },
                                    { title: "Semana Bio-Natural", date: "15 Out, 2023", reach: "Todas as Lojas", icon: "eco" },
                                    { title: "Check-up Preventivo", date: "22 Out, 2023", reach: "5 Lojas SP", icon: "health_and_safety" },
                                    { title: "Desconto Progressivo", date: "01 Nov, 2023", reach: "Rede Sul", icon: "percent" }
                                ].map((promo, i) => (
                                    <div key={i} className="bg-[#193324]/30 md:bg-white md:dark:bg-[#193324] border border-[#326748]/50 md:border-slate-200 md:dark:border-white/5 rounded-[24px] p-5 flex gap-4 items-center shadow-md group hover:bg-[#193324]/50 md:hover:shadow-lg transition-all">
                                        <div className="size-20 rounded-2xl overflow-hidden shrink-0 border border-[#326748] md:border-slate-100 md:dark:border-white/10 flex items-center justify-center bg-slate-800 md:bg-slate-100 md:dark:bg-slate-800">
                                            <MaterialIcon name={promo.icon} className="text-3xl text-primary/40 md:text-primary md:opacity-80 group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white md:text-slate-900 md:dark:text-white font-black text-base truncate italic">{promo.title}</h4>
                                            <p className="text-[#92c9a9] md:text-slate-500 md:dark:text-[#92c9a9] text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Válido até {promo.date}</p>
                                            <div className="flex gap-2 mt-3">
                                                <span className="text-[9px] font-black uppercase tracking-widest bg-black/30 md:bg-slate-100 md:dark:bg-black/30 text-[#92c9a9] px-3 py-1 rounded-full border border-[#326748] md:border-transparent italic">{promo.reach}</span>
                                            </div>
                                        </div>
                                        <button className="bg-red-500/10 text-red-500 size-12 rounded-2xl hover:bg-red-500/20 transition-colors active:scale-90 border border-red-500/10 flex items-center justify-center">
                                            <MaterialIcon name="block" className="text-xl" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
