import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;
            alert('Senha atualizada com sucesso!');
            navigate('/login');
        } catch (error: any) {
            console.error('Erro ao atualizar senha:', error);
            alert(error.message || 'Erro ao atualizar senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark max-w-[480px] mx-auto font-display transition-colors duration-200">
            <div className="flex items-center p-4 pb-2 justify-between">
                <button
                    onClick={() => navigate('/login')}
                    className="flex size-12 shrink-0 items-center justify-start cursor-pointer text-slate-900 dark:text-white"
                >
                    <MaterialIcon name="close" className="text-[24px]" />
                </button>
            </div>

            <div className="flex flex-col flex-1 px-4">
                <h1 className="text-slate-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight pt-8 pb-3">Nova Senha</h1>
                <p className="text-slate-500 dark:text-[#92a4c9] text-base font-normal leading-normal pt-1 pb-8">Defina sua nova senha de acesso.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col w-full">
                        <label className="flex flex-col w-full">
                            <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">Senha</p>
                            <div className="relative flex items-center">
                                <input
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input flex w-full rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] h-14 p-[15px] pr-12 text-base font-normal"
                                    placeholder="No mínimo 6 caracteres"
                                    type={showPassword ? "text" : "password"}
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 text-slate-400"
                                >
                                    <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} />
                                </button>
                            </div>
                        </label>
                    </div>

                    <div className="flex flex-col w-full">
                        <label className="flex flex-col w-full">
                            <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">Confirmar Senha</p>
                            <input
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="form-input flex w-full rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] h-14 p-[15px] text-base font-normal"
                                placeholder="Repita a nova senha"
                                type={showPassword ? "text" : "password"}
                                minLength={6}
                            />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !password || password !== confirmPassword}
                        className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 bg-primary text-background-dark text-base font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                        <span>{loading ? 'Salvando...' : 'Redefinir Senha'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
