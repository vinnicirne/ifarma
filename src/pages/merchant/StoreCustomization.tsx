import MerchantLayout from './MerchantLayout';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const StoreCustomization = () => {
    return (
        <MerchantLayout activeTab="settings" title="Configurações">
            <div className="max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Minha Loja</h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Personalize como sua farmácia aparece no app.</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5 p-8 shadow-sm mb-8">
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100 dark:border-white/5">
                        <div className="size-24 rounded-[32px] bg-primary/10 border-2 border-primary/20 flex items-center justify-center relative group cursor-pointer">
                            <MaterialIcon name="store" className="text-4xl text-primary" />
                            <div className="absolute inset-0 bg-black/50 rounded-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <MaterialIcon name="edit" className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic text-slate-900 dark:text-white">Farmácia Central</h2>
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20 mt-2 inline-block">Online</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Nome Fantasia</span>
                            <input className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white" defaultValue="Farmácia Central" />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Telefone</span>
                            <input className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white" defaultValue="(11) 98765-4321" />
                        </label>

                        <div className="md:col-span-2">
                            <h3 className="text-sm font-black italic text-slate-900 dark:text-white mb-4 mt-2">Status da Loja</h3>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-black/20 rounded-2xl cursor-pointer border border-transparent hover:border-primary/50 transition-colors w-full md:w-auto">
                                    <input type="radio" name="status" defaultChecked className="accent-primary size-5" />
                                    <div>
                                        <span className="block font-bold text-sm text-slate-900 dark:text-white">Aberta</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-black">Recebendo pedidos normalmente</span>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-black/20 rounded-2xl cursor-pointer border border-transparent hover:border-primary/50 transition-colors w-full md:w-auto">
                                    <input type="radio" name="status" className="accent-primary size-5" />
                                    <div>
                                        <span className="block font-bold text-sm text-slate-900 dark:text-white">Fechada</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-black">Não aceita novos pedidos</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex justify-end">
                        <button className="bg-primary text-background-dark font-black h-12 px-8 rounded-2xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        </MerchantLayout>
    );
};

export default StoreCustomization;
