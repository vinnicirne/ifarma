import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const MotoboyLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Se o usuário digitou apenas o telefone, tentamos converter para um formato de e-mail interno se necessário
            // Ou assumimos que ele digitou o e-mail cadastrado
            const loginEmail = email.includes('@') ? email : `${email.replace(/\D/g, '')}@motoboy.ifarma.com`;

            const { error, data } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password
            });

            if (error) throw error;

            console.log('✅ Motoboy logado:', data.user.id);
            navigate('/motoboy-dashboard');
        } catch (error: any) {
            console.error('Erro no login do motoboy:', error);
            alert(error.message || 'Erro ao entrar. Verifique seus dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden font-display text-white transition-colors duration-200">
            {/* Header / Top Bar */}
            <div className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between">
                <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Login do Motoboy</h2>
            </div>

            <div className="flex flex-col flex-1 px-6 pt-4 max-w-md mx-auto w-full">
                {/* Logo Section (Pharmacy Logo) */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                        <MaterialIcon name="local_pharmacy" className="text-primary text-4xl" />
                    </div>
                </div>

                {/* Headline Section */}
                <div className="mb-8">
                    <h2 className="text-slate-900 dark:text-white tracking-light text-[28px] font-bold leading-tight text-center pb-2">Bem-vindo à equipe de entregas</h2>
                    <p className="text-slate-500 dark:text-[#90a4cb] text-center text-sm font-medium">PharmaLink Platform</p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Phone Field */}
                    <div className="flex flex-wrap items-end gap-4 py-1">
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-slate-700 dark:text-white text-base font-medium leading-normal pb-2">E-mail ou Telefone</p>
                            <input
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-[#314368] bg-white dark:bg-[#182234] focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#90a4cb] p-[15px] text-base font-normal leading-normal transition-colors"
                                placeholder="seu@email.com ou 00000000000"
                                type="text"
                            />
                        </label>
                    </div>

                    {/* Password Field */}
                    <div className="flex flex-wrap items-end gap-4 py-1">
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-slate-700 dark:text-white text-base font-medium leading-normal pb-2">Senha</p>
                            <div className="flex w-full flex-1 items-stretch rounded-lg">
                                <input
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-[#314368] bg-white dark:bg-[#182234] focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#90a4cb] p-[15px] rounded-r-none border-r-0 pr-2 text-base font-normal leading-normal transition-colors"
                                    placeholder="Digite sua senha"
                                    type={showPassword ? "text" : "password"}
                                />
                                <div
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-400 dark:text-[#90a4cb] flex border border-slate-300 dark:border-[#314368] bg-white dark:bg-[#182234] items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer transition-colors"
                                >
                                    <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} />
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Forgot Password */}
                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            className="text-primary text-sm font-medium hover:underline"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>

                    {/* Login Button */}
                    <div className="mt-10">
                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full h-14 bg-primary hover:bg-primary/90 text-background-dark font-black text-lg rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span>{loading ? 'Entrando...' : 'Entrar'}</span>
                            {!loading && <MaterialIcon name="arrow_forward" />}
                        </button>
                    </div>
                </form>

                {/* Image/Banner Section (Subtle) */}
                <div className="mt-12 @container">
                    <div className="@[480px]:px-4 @[480px]:py-3">
                        <div
                            className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-background-light dark:bg-background-dark rounded-xl min-h-[120px] opacity-40 grayscale"
                            style={{ backgroundImage: 'linear-gradient(to bottom, rgba(16, 22, 34, 0), rgba(16, 22, 34, 0.9)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuAVwDMsNeLh-ld-KD4j_tSIFD_Uei15CN58S973uvZFB_8QCXFUDsViOMGwiGu3OQpzhUinwXl4kMLiC-4jN5-ZO0I1EzZ3EiKKXOa57DRitet8BXChEkWlrnU8U3JdeB_v0XIFIwgUm2dNplFEO5lPWoufxitKt3VXnwyLf-d87ptT0qK0rUzxrXAaJbTttz1epnxeZWAowS0mqenzMKyBkhffHt94jXZ5lGOLeQNwBGE93R8vpw_YKUidQlMcAVYdgYVEgby1tw")' }}
                        >
                        </div>
                    </div>
                </div>

                {/* Footer Help */}
                <div className="p-6 text-center mt-auto">
                    <p className="text-slate-500 dark:text-[#90a4cb] text-xs">
                        Problemas para entrar? Contate o gerente da farmácia.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MotoboyLogin;
