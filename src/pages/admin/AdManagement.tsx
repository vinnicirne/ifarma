import React from 'react';
import { MaterialIcon } from '../../components/Shared';

export const AdManagement = ({ profile }: { profile: any }) => {
    return (
        <div className="flex flex-col gap-6">
            {/* Desktop Header */}
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Anúncios e Destaques</h1>
                <div className="flex gap-3">
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-10 px-4 flex-1 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all">
                        <MaterialIcon name="bar_chart" className="text-primary" />
                        <span className="truncate">Relatório</span>
                    </button>
                    <button className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest">
                        <MaterialIcon name="add_photo_alternate" />
                        <span>Novo Banner</span>
                    </button>
                </div>
            </header>

            {/* Mobile Header */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 md:hidden">
                <div className="flex items-center p-4 justify-between w-full">
                    <div className="flex items-center gap-3">
                        <MaterialIcon name="campaign" className="text-primary" />
                        <h1 className="text-lg font-black tracking-tighter italic">Anúncios e Destaques</h1>
                    </div>
                    <button className="flex items-center justify-center rounded-full w-10 h-10 bg-slate-200 dark:bg-white/10 active:scale-95 transition-transform">
                        <MaterialIcon name="account_circle" />
                    </button>
                </div>
            </header>

            <main className="pb-32 md:pb-10 p-4 md:p-8">
                {/* Stats Row */}
                <div className="flex md:grid md:grid-cols-4 flex-nowrap gap-4 mb-8 overflow-x-auto no-scrollbar md:overflow-visible">
                    {[
                        { label: 'CTR Médio', value: '1.2%', trend: '+0.2%', icon: 'trending_up' },
                        { label: 'Cliques', value: '4.5k', trend: '+12%', icon: 'trending_up' },
                        { label: 'Impressões', value: '124k', trend: '+8%', icon: 'visibility' },
                        { label: 'Ocupação', value: '8/10', sub: '2 vago(s)', icon: 'space_dashboard' }
                    ].map((stat, i) => (stat.label !== 'Ocupação' ? (
                        <div key={i} className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-[24px] p-5 bg-white dark:bg-[#193324] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                            <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black italic tracking-tighter mt-1">{stat.value}</p>
                            <p className="text-primary text-[10px] font-black uppercase flex items-center gap-1">
                                <MaterialIcon name={stat.icon} className="text-xs" /> {stat.trend}
                            </p>
                        </div>
                    ) : (
                        <div key={i} className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-[24px] p-5 bg-white dark:bg-[#193324] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                            <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black italic tracking-tighter mt-1">{stat.value}</p>
                            <p className="text-slate-400 dark:text-[#92c9a9] text-[10px] font-black uppercase opacity-60">{stat.sub}</p>
                        </div>
                    )))}
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* New Banner Form */}
                    <div className="lg:w-1/3">
                        <div className="bg-white dark:bg-[#193324] rounded-[32px] p-6 border border-slate-200 dark:border-white/5 shadow-md sticky top-24">
                            <h3 className="font-black text-lg mb-5 flex items-center gap-2 italic tracking-tighter">
                                <MaterialIcon name="add_photo_alternate" className="text-primary" />
                                Novo Banner
                            </h3>
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-black/20 hover:border-primary/50 transition-colors cursor-pointer group">
                                    <MaterialIcon name="cloud_upload" className="text-4xl opacity-50 group-hover:scale-110 transition-transform text-primary" />
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Toque para subir imagem</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-black/40 rounded-2xl">
                                    {['Topo', 'Meio', 'Base'].map((pos, i) => (
                                        <button key={pos} className={`${i === 0 ? 'bg-primary text-background-dark font-black' : 'text-slate-400 dark:text-white/40 font-bold'} text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all`}>
                                            {pos}
                                        </button>
                                    ))}
                                </div>

                                <button className="w-full bg-primary text-background-dark font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-primary/20 uppercase tracking-tighter text-sm">
                                    <MaterialIcon name="send" />
                                    Publicar Anúncio
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between pb-6 pt-2">
                            <h2 className="text-xl font-black tracking-tighter italic">Banners Ativos</h2>
                            <button className="text-primary text-[10px] font-black uppercase tracking-widest italic hover:opacity-70 transition-opacity">Ver todos</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: "Ofertas Tech", expires: "4 dias", pos: "Topo", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHACRZmVb42PYIBzLy7gmzY_q_YhSIHyvDau2dxOA2z_U3gzJacmOzSkMClFVtyAPzNlH27cJrWQpM1PuL4OyIxvy0xqPb7ciZMEphK-DxtyAMasGNk_ygqzjDeE6oQypV8mHEenKAbT6I7bNB2wPTaT8OcEeXrhSOafXQLuZd86KLf_yxEamRbwRwi05Tz9om_4LYDcczkBt3TTytmpDwheSDLPu8aaqducBjhg2KlO2jzvJQUKxHOM_tGl4B-cyfui7Ny7moCg", perf: 80, ctr: "0.8%" },
                                { title: "Coleção Verão", expires: "12 dias", pos: "Meio", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ04Sw1VT5QvkJqYdvfTJoDG5ErpqPQ69kAw-tdAxZpJT7XLhmtP-knbT84AGm3FPtM-kMBGE_gdXbWQVY18kE6c7R7GO2VIi9u5pjxpNJV74ueHwVitIAqdcozVScJTaothKpmn_sUpDHDS3yrsssaDL2PbnTYf9JUHsG8bFogG0EiHPAX9y8FdvOrXQ9Zd-mSE25shiGXTlR_cXmjlZlgZ5s520e-23FzsUNLVOeE0_QZomXX2L72Aw4o38jHCC9qy3bR0k0kQ", perf: 100, ctr: "1.4%" },
                                { title: "Semana da Beleza", expires: "20 dias", pos: "Base", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAc3-5o_8tY_y_9f9o-o-Y_8-t9_y_9f9o-o-Y_8-t9_y_9f9o-o-Y_8-t9_y_9f9o-o-Y_8-t9_y_9f9o-o-Y_8-t9", perf: 45, ctr: "0.5%" },
                            ].map((ad, i) => (
                                <div key={i} className="flex flex-col gap-4 rounded-[32px] bg-white dark:bg-[#193324] p-5 shadow-sm border border-slate-200 dark:border-white/5 group hover:scale-[1.01] transition-transform">
                                    <div className="flex gap-4">
                                        <div className="w-24 h-24 bg-center bg-no-repeat bg-cover rounded-2xl flex-shrink-0 border border-slate-100 dark:border-white/10 shadow-inner" style={{ backgroundImage: `url("${ad.img}")` }}></div>
                                        <div className="flex flex-col justify-between py-1 flex-grow">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <p className={`${ad.pos === 'Topo' ? 'bg-primary/20 text-primary border-primary/20' : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-slate-300 border-transparent'} text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border`}>{ad.pos}</p>
                                                    <button className="text-slate-400 hover:text-white transition-colors">
                                                        <MaterialIcon name="more_vert" />
                                                    </button>
                                                </div>
                                                <p className="text-lg font-black leading-tight mt-2 italic tracking-tight">{ad.title}</p>
                                                <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Expira em {ad.expires}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button className="flex-1 flex items-center justify-center rounded-xl h-9 px-3 bg-slate-100 dark:bg-[#234833] text-[9px] font-black uppercase tracking-widest gap-1 border border-black/5 dark:border-white/5 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-[#2d5c41]">
                                            <MaterialIcon name="edit" className="text-xs" /> Editar
                                        </button>
                                        <button className="flex-1 flex items-center justify-center rounded-xl h-9 px-3 bg-slate-100 dark:bg-[#234833] text-[9px] font-black uppercase tracking-widest gap-1 border border-black/5 dark:border-white/5 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-[#2d5c41]">
                                            <MaterialIcon name="pause" className="text-xs text-red-500" /> Pausar
                                        </button>
                                    </div>

                                    {/* Performance Indicator */}
                                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                            <span className="text-slate-500 dark:text-[#92c9a9]">Performance</span>
                                            <span className="text-primary">{ad.ctr} CTR</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-[#326748] rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(19,236,109,0.3)] transition-all duration-1000" style={{ width: `${ad.perf}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
