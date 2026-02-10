import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../Shared';

export const Auth = ({ view = 'login' }: { view?: 'login' | 'signup' }) => {
    const [isLogin, setIsLogin] = useState(view === 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                console.log('🔐 Tentando fazer login com:', email);
                const { error, data } = await supabase.auth.signInWithPassword({ email, password });

                if (error) {
                    console.error('❌ Erro no login:', error);
                    alert(`Erro no login: ${error.message}`);
                } else {
                    console.log('✅ Login bem-sucedido!', data);

                    // Buscar perfil do usuário para redirecionar corretamente
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError) {
                        console.error('Erro ao buscar perfil:', profileError);
                        navigate('/');
                    } else {
                        // Redirecionar baseado no role
                        switch (profileData.role) {
                            case 'admin':
                            case 'operator':
                                navigate('/dashboard');
                                break;
                            case 'merchant':
                                navigate('/gestor');
                                break;
                            case 'motoboy':
                                navigate('/motoboy-dashboard');
                                break;
                            default:
                                navigate('/');
                        }
                    }
                }
            } else {
                console.log('📝 Tentando criar conta para:', email);
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                });

                if (error) {
                    console.error('❌ Erro no cadastro:', error);
                    alert(`Erro no cadastro: ${error.message}`);
                } else {
                    console.log('✅ Cadastro bem-sucedido!');
                    alert('Verifique seu e-mail para confirmar o cadastro!');
                }
            }
        } catch (err) {
            console.error('❌ Erro inesperado:', err);
            // Removed complex error handling for now to simplify
            alert('Erro inesperado');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 font-display">
            <div className="w-full max-w-md bg-[#1a2e23] rounded-[40px] p-8 border border-white/5 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
                        <MaterialIcon name="lock" className="text-primary text-3xl" />
                    </div>
                    <h2 className="text-2xl font-black italic text-white tracking-tighter">
                        {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                        AppIfarma
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && (
                        <label className="flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nome Completo</span>
                            <input
                                required
                                className="h-14 px-5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/20 font-bold italic"
                                placeholder="Ex: João Silva"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                            />
                        </label>
                    )}
                    <label className="flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">E-mail</span>
                        <input
                            required
                            type="email"
                            className="h-14 px-5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/20 font-bold italic"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Senha</span>
                        <input
                            required
                            type="password"
                            className="h-14 px-5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/20 font-bold italic"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-background-dark font-black py-5 rounded-3xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-tighter mt-4"
                    >
                        {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
                    </button>
                </form>

                <div className="mt-8 text-center space-y-4">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors block w-full"
                    >
                        {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
                    </button>

                    <div className="w-full h-px bg-white/5 my-4"></div>

                    <Link to="/partner/register" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
                        <MaterialIcon name="storefront" className="text-lg group-hover:text-primary transition-colors" />
                        <span className="text-xs font-bold">Cadastre sua farmácia e venda online</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};
