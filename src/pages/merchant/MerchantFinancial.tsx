import MerchantLayout from './MerchantLayout';

const MerchantFinancial = () => {
    return (
        <MerchantLayout activeTab="financial" title="Financeiro">
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="size-24 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-slate-400">payments</span>
                </div>
                <h2 className="text-2xl font-black italic text-slate-900 dark:text-white">Em Breve</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">
                    O módulo financeiro está em desenvolvimento. Logo você poderá acompanhar seus repasses e extratos por aqui.
                </p>
            </div>
        </MerchantLayout>
    );
};

export default MerchantFinancial;
