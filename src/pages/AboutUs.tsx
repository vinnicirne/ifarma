import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Shield, Zap, Users, ArrowLeft, Pill, MapPin, Star } from 'lucide-react';

const AboutUs = () => {
    const navigate = useNavigate();

    const stats = [
        { label: 'Farmácias Parcerias', value: '500+', icon: <Pill className="text-primary" size={20} /> },
        { label: 'Entregas Realizadas', value: '50k+', icon: <Zap className="text-amber-500" size={20} /> },
        { label: 'Cidades Atendidas', value: '12', icon: <MapPin className="text-blue-500" size={20} /> },
    ];

    const values = [
        {
            title: 'Saúde em Primeiro Lugar',
            description: 'Nascemos para tornar o acesso a medicamentos mais rápido, seguro e humano.',
            icon: <Heart className="text-red-500" />
        },
        {
            title: 'Tecnologia Ética',
            description: 'Unimos algoritmos avançados com o cuidado farmacêutico tradicional.',
            icon: <Zap className="text-primary" />
        },
        {
            title: 'Confiança Total',
            description: 'Trabalhamos apenas com farmácias certificadas e entregadores profissionais.',
            icon: <Shield className="text-blue-400" />
        }
    ];

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-zinc-950 text-white overflow-x-hidden max-w-[480px] mx-auto shadow-2xl font-display">
            {/* Elegant Header */}
            <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="size-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all border border-white/5"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-black italic tracking-tighter leading-none">ifarma</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Nossa História</p>
                </div>
            </div>

            <div className="flex-1">
                {/* Hero Section with Glass Card */}
                <div className="relative p-8 pt-12 text-center overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 blur-[100px] -z-10 rounded-full"></div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                        <Star size={12} className="text-primary fill-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Revolucionando a Saúde</span>
                    </div>

                    <h2 className="text-4xl font-black italic tracking-tighter mb-6 leading-tight">
                        Conectando você ao que <br />
                        <span className="text-primary">mais importa:</span> cuidado.
                    </h2>

                    <p className="text-zinc-400 text-sm leading-relaxed mb-10 max-w-[320px] mx-auto">
                        O **ifarma** surgiu para simplificar a jornada de saúde do brasileiro. Somos a ponte inteligente entre sua farmácia de confiança e a sua porta.
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        {stats.map((stat, i) => (
                            <div key={i} className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                                <div className="mb-2 opacity-80">{stat.icon}</div>
                                <span className="text-lg font-black italic text-white">{stat.value}</span>
                                <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 text-center leading-tight mt-1">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Values Section */}
                <div className="p-8 pb-20">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-8 border-l-2 border-primary pl-4">Por que existimos</h3>

                    <div className="space-y-6">
                        {values.map((value, i) => (
                            <div key={i} className="flex gap-5 p-6 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                                <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                    {value.icon}
                                </div>
                                <div>
                                    <h4 className="font-black italic text-zinc-200 mb-1">{value.title}</h4>
                                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                                        {value.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mission Quote */}
                    <div className="mt-12 p-8 rounded-[40px] bg-gradient-to-br from-primary/20 to-transparent border border-primary/10 relative overflow-hidden">
                        <Users className="absolute -right-4 -bottom-4 text-primary opacity-5" size={120} />
                        <p className="text-primary font-black italic text-xl leading-snug relative z-10">
                            "Acreditamos que ninguém deve esperar quando o assunto é bem-estar."
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="w-10 h-1 bg-primary rounded-full"></div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Time iFarma</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-10 text-center border-t border-white/5 bg-black/20">
                <div className="flex items-center justify-center gap-2 mb-4 opacity-30">
                    <div className="size-2 rounded-full bg-primary"></div>
                    <h1 className="text-lg font-black italic tracking-tighter text-white">ifarma</h1>
                </div>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">
                    Tecnologia para uma vida melhor.
                </p>
            </div>

            {/* iOS Indicator */}
            <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/10 rounded-full z-[60]"></div>
        </div>
    );
};

export default AboutUs;
