import React from 'react';
import { useNavigate } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const ForgotPassword = () => {
    const navigate = useNavigate();

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark max-w-[480px] mx-auto font-display transition-colors duration-200">
            {/* TopAppBar */}
            <div className="flex items-center p-4 pb-2 justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex size-12 shrink-0 items-center justify-start cursor-pointer active:scale-90 transition-transform text-slate-900 dark:text-white"
                >
                    <MaterialIcon name="arrow_back_ios" className="text-[24px]" />
                </button>
                <div className="flex-1"></div>
            </div>

            {/* Content Container */}
            <div className="flex flex-col flex-1 px-4">
                {/* HeadlineText */}
                <h1 className="text-slate-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight pt-8 pb-3">Esqueceu sua senha?</h1>
                {/* BodyText */}
                <p className="text-slate-500 dark:text-[#92a4c9] text-base font-normal leading-normal pt-1 pb-8">Insira seu e-mail para receber um código de verificação e recuperar o acesso à sua conta.</p>

                {/* Form Section */}
                <div className="flex flex-col gap-6">
                    {/* TextField */}
                    <div className="flex flex-col w-full">
                        <label className="flex flex-col w-full">
                            <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">E-mail</p>
                            <div className="relative flex items-center">
                                <input
                                    className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#192233] focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#92a4c9] p-[15px] text-base font-normal leading-normal transition-colors"
                                    placeholder="exemplo@email.com"
                                    type="email"
                                />
                            </div>
                        </label>
                    </div>

                    {/* SingleButton */}
                    <div className="flex py-2">
                        <button className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 bg-primary text-white text-base font-bold leading-normal tracking-wide active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 hover:bg-primary/90">
                            <span>Enviar Código</span>
                        </button>
                    </div>
                </div>

                {/* Back to Login Link */}
                <div className="mt-auto pb-10 flex justify-center">
                    <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-primary font-semibold text-base hover:underline cursor-pointer">
                        <span>Voltar para o Login</span>
                    </button>
                </div>
            </div>

            {/* Decorative Element */}
            <div className="absolute bottom-0 left-0 w-full h-1/4 -z-10 bg-gradient-to-t from-primary/10 to-transparent opacity-50 pointer-events-none"></div>
        </div>
    );
};

export default ForgotPassword;
