import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../../components/Shared';

export const PrescriptionUpload = () => {
    const navigate = useNavigate();
    return (
        <div className="relative flex h-auto min-h-screen w-full max-w-md mx-auto flex-col bg-background-light dark:bg-background-dark shadow-2xl overflow-x-hidden border-x border-black/5 dark:border-white/5 pb-24">
            {/* TopAppBar */}
            <header className="sticky top-0 z-50 bg-background-light dark:bg-background-dark border-b border-black/5 dark:border-white/5">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button onClick={() => navigate(-1)} className="text-background-dark dark:text-white flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <MaterialIcon name="arrow_back_ios" className="text-xl" />
                    </button>
                    <h1 className="text-background-dark dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                        Enviar Receita Médica
                    </h1>
                </div>
            </header>

            <main className="flex-1 flex flex-col gap-6 p-4 w-full">
                {/* EmptyState (Upload Area) */}
                <div className="flex flex-col">
                    <div className="flex flex-col items-center gap-6 rounded-3xl border-2 border-dashed border-primary/40 dark:border-primary/20 bg-primary/5 px-6 py-14 hover:bg-primary/10 transition-colors cursor-pointer group shadow-sm">
                        <div className="bg-primary/20 p-4 rounded-full text-primary">
                            <MaterialIcon name="cloud_upload" className="text-4xl" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-background-dark dark:text-white text-lg font-bold leading-tight text-center">
                                Fazer upload da foto ou PDF
                            </p>
                            <p className="text-background-dark/60 dark:text-white/60 text-sm font-medium leading-normal text-center">
                                Formatos aceitos: JPG, PNG ou PDF
                            </p>
                        </div>
                        <button className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary text-background-dark text-sm font-bold leading-normal tracking-wide shadow-sm hover:scale-105 transition-transform active:scale-95">
                            <span className="truncate">Selecionar Arquivo</span>
                        </button>
                    </div>
                </div>

                {/* TextField (Observations) */}
                <div className="flex flex-col gap-2">
                    <label className="flex flex-col w-full">
                        <p className="text-background-dark dark:text-white text-sm font-bold leading-normal pb-2 px-1 uppercase tracking-wider opacity-60">
                            Observações adicionais
                        </p>
                        <textarea className="form-input flex w-full resize-none overflow-hidden rounded-2xl text-background-dark dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/30 border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:border-primary min-h-[140px] placeholder:text-background-dark/30 dark:placeholder:text-white/30 p-4 text-base font-medium leading-normal transition-all" placeholder="Ex: Necessito de genérico, entrega urgente, etc."></textarea>
                    </label>
                </div>

                {/* Privacy & Security Notice */}
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="text-primary shrink-0">
                        <MaterialIcon name="verified_user" />
                    </div>
                    <p className="text-background-dark/70 dark:text-white/70 text-[13px] leading-snug font-medium">
                        Seus dados estão protegidos. Suas informações médicas são tratadas com total sigilo e segurança conforme a LGPD.
                    </p>
                </div>
            </main>

            {/* Footer Action */}
            <footer className="p-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-black/5 dark:border-white/5 w-full fixed bottom-0 max-w-md left-1/2 -translate-x-1/2 z-20">
                <div className="flex">
                    <button
                        onClick={() => {
                            alert('Receita enviada com sucesso! A farmácia validará em instantes.');
                            navigate(-1);
                        }}
                        className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 flex-1 bg-primary text-background-dark text-lg font-black leading-normal tracking-wide shadow-lg shadow-primary/20 active:scale-95 transition-all uppercase tracking-tighter"
                    >
                        Confirmar Envio
                    </button>
                </div>
                {/* iOS Home Indicator Spacing */}
                <div className="h-6"></div>
            </footer>
        </div>
    );
};
