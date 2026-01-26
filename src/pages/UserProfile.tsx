import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const UserProfile = ({ session, profile }: { session: any, profile: any }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        cpf: '',
        phone: '',
        avatar_url: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                cpf: profile.cpf || '',
                phone: profile.phone || '',
                avatar_url: profile.avatar_url || ''
            });
        }
    }, [profile]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    cpf: formData.cpf,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url
                })
                .eq('id', session.user.id);

            if (error) throw error;
            setIsEditing(false);
            // O ideal seria recarregar o profile via contexto, mas por enquanto o banco atualiza
            // e se o App.tsx observar changes ou recarregar, vai funcionar.
            window.location.reload(); // Forçar refresh simples para ver dados novos
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            alert('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

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
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-4 border-primary/20 shadow-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                            style={profile?.avatar_url ? { backgroundImage: `url("${profile.avatar_url}")` } : {}}
                        >
                            {!profile?.avatar_url && <MaterialIcon name="person" className="text-6xl text-slate-300" />}
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-background-dark hover:bg-primary/90 transition-colors active:scale-95"
                        >
                            <MaterialIcon name="edit" className="text-sm" />
                        </button>
                    </div>
                    <div className="mt-4 flex flex-col items-center text-center">
                        <h2 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-tight">
                            {profile?.full_name || session?.user?.email?.split('@')[0] || 'Usuário'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                            Membro desde {new Date(session?.user?.created_at || Date.now()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-primary text-sm font-semibold mt-0.5">{session?.user?.email}</p>
                    </div>
                </section>

                {/* Addresses Section (Placeholder) */}
                <section className="mt-4">
                    <div className="flex items-center justify-between px-4 mb-2">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Meus Endereços</h3>
                        <button className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity">Adicionar</button>
                    </div>
                    <div className="px-4 py-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-2xl mx-4 border border-slate-100 dark:border-slate-800">
                        <MaterialIcon name="location_off" className="text-4xl mb-2 opacity-50" />
                        <p className="text-sm font-medium text-center">Nenhum endereço cadastrado</p>
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
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{profile?.full_name || 'Não informado'}</p>
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
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{profile?.cpf || 'Não informado'}</p>
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
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{profile?.phone || 'Não informado'}</p>
                                </div>
                            </div>
                            <MaterialIcon name="chevron_right" className="text-slate-400 text-[20px]" />
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="mt-12 px-4">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-xl font-bold transition-colors active:scale-98 cursor-pointer">
                        <MaterialIcon name="logout" />
                        Sair da Conta
                    </button>
                    <p className="text-center text-slate-500 dark:text-slate-600 text-xs mt-6">Versão 2.4.15 - PharmaMarket iOS</p>
                </section>
            </main>

            {/* Edit Profile Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Perfil</h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                                <MaterialIcon name="close" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foto de Perfil (URL)</label>
                                <input
                                    type="text"
                                    value={formData.avatar_url}
                                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Celular</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full bg-primary text-black font-bold py-3 rounded-xl mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar (iOS Style) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe shadow-2xl z-50">
                <div className="max-w-md mx-auto flex justify-around items-center h-16">
                    <Link to="/" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary transition-colors">
                        <MaterialIcon name="home" />
                        <span className="text-[10px] font-medium">Início</span>
                    </Link>
                    <Link to="/pharmacies" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary transition-colors">
                        <MaterialIcon name="search" />
                        <span className="text-[10px] font-medium">Busca</span>
                    </Link>
                    <Link to="/cart" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary transition-colors">
                        <MaterialIcon name="shopping_cart" />
                        <span className="text-[10px] font-medium">Carrinho</span>
                    </Link>
                    <Link to="/order-tracking" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary transition-colors">
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
