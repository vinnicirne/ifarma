import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const MerchantLogin = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error, data } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Optional: Check if user has 'store_owner' role
            // const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
            // if (profile?.role !== 'store_owner' && profile?.role !== 'admin') { ... }

            navigate('/gestor');
        } catch (error: any) {
            alert(error.message || 'Erro ao entrar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-900 font-display flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-[32px] p-8 md:p-10 shadow-xl border border-slate-100 dark:border-white/5">

                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="size-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                        <MaterialIcon name="storefront" className="text-background-dark text-3xl" />
                    </div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Portal do Gestor</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">
                        Gestão da sua farmácia
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">E-mail Profissional</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <MaterialIcon name="mail" className="text-slate-400" />
                            </div>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full h-14 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none focus:ring-2 focus:ring-primary outline-none font-medium text-slate-900 dark:text-white transition-all"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Senha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <MaterialIcon name="lock" className="text-slate-400" />
                            </div>
                            <input
                                required
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full h-14 pl-12 pr-12 rounded-xl bg-slate-50 dark:bg-black/20 border-none focus:ring-2 focus:ring-primary outline-none font-medium text-slate-900 dark:text-white transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Link to="/forgot-password" className="text-xs font-bold text-primary hover:underline">
                            Esqueceu a senha?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Entrando...' : 'Acessar Painel'}
                        {!loading && <MaterialIcon name="login" />}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Ainda não é parceiro?
                    </p>
                    <Link to="/partner/register" className="inline-block mt-2 text-primary font-black uppercase tracking-widest text-xs hover:underline">
                        Cadastre sua Farmácia
                    </Link>
                </div>

            </div>

            <Link to="/" className="mt-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                <MaterialIcon name="arrow_back" className="text-sm" />
                Voltar para Loja
            </Link>
        </div>
    );
};

export default MerchantLogin;
