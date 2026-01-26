import { useState } from 'react';
import MerchantLayout from './MerchantLayout';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const InventoryControl = () => {
    const [products] = useState([
        { id: 1, name: 'Dipirona Sódica 500mg', brand: 'Medley', stock: 154, price: '8,99', status: 'Ativo' },
        { id: 2, name: 'Vitamina C 1g', brand: 'Cenevit', stock: 32, price: '22,90', status: 'Baixo Estoque' },
        { id: 3, name: 'Shampoo Anticaspa', brand: 'Clear', stock: 5, price: '28,50', status: 'Crítico' },
        { id: 4, name: 'Protetor Solar FPS 50', brand: 'Sundown', stock: 0, price: '45,00', status: 'Sem Estoque' },
        { id: 5, name: 'Dorflex 10 cpr', brand: 'Sanofi', stock: 200, price: '6,50', status: 'Ativo' },
    ]);

    return (
        <MerchantLayout activeTab="products" title="Produtos">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Inventário</h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Gerencie seus produtos e preços.</p>
                </div>
                <button className="bg-primary hover:bg-primary/90 text-background-dark flex h-12 px-6 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 gap-2 text-xs font-black uppercase tracking-widest">
                    <MaterialIcon name="add_circle" />
                    Adicionar Produto
                </button>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <div className="col-span-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto / Marca</div>
                    <div className="col-span-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Estoque</div>
                    <div className="col-span-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Preço (R$)</div>
                    <div className="col-span-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</div>
                    <div className="col-span-1 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {products.map((prod) => (
                        <div key={prod.id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                            <div className="col-span-5 flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-slate-100 dark:bg-black/20 flex items-center justify-center border border-slate-200 dark:border-white/5">
                                    <MaterialIcon name="medication" className="text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{prod.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{prod.brand}</p>
                                </div>
                            </div>

                            <div className="col-span-2 flex justify-center">
                                <span className={`px-3 py-1 rounded-xl text-xs font-black ${prod.stock <= 5 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-slate-300'}`}>
                                    {prod.stock} un
                                </span>
                            </div>

                            <div className="col-span-2 text-center font-black text-slate-700 dark:text-slate-200 text-sm">
                                R$ {prod.price}
                            </div>

                            <div className="col-span-2 flex justify-center">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${prod.stock === 0 ? 'border-red-500 text-red-500 bg-red-500/10' :
                                        prod.stock <= 10 ? 'border-orange-500 text-orange-500 bg-orange-500/10' :
                                            'border-green-500 text-green-500 bg-green-500/10'
                                    }`}>
                                    {prod.status}
                                </span>
                            </div>

                            <div className="col-span-1 flex justify-center">
                                <button className="size-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors flex items-center justify-center">
                                    <MaterialIcon name="edit" className="text-sm" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </MerchantLayout>
    );
};

export default InventoryControl;
