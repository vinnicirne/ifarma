import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import MerchantLayout from './MerchantLayout';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const StoreCustomization = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pharmacy, setPharmacy] = useState<any>(null);

    // Form States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [address, setAddress] = useState('');
    const [isOpen, setIsOpen] = useState(true);
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');

    const logoInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPharmacyData();
    }, []);

    const fetchPharmacyData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('pharmacies')
                .select('*')
                .eq('owner_id', user.id)
                .single();

            if (data) {
                setPharmacy(data);
                setName(data.name || '');
                setPhone(data.phone || '');
                setCnpj(data.cnpj || '');
                setAddress(data.address || ''); // Assuming full address stored here or composite
                setIsOpen(data.is_open ?? true);
                setLogoUrl(data.logo_url || '');
                setBannerUrl(data.banner_url || '');
            }
        } catch (error) {
            console.error("Error fetching pharmacy:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Convert to Base64 (Local Storage approach as requested)
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (type === 'logo') setLogoUrl(base64String);
            else setBannerUrl(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!pharmacy) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('pharmacies')
                .update({
                    name,
                    phone,
                    cnpj,
                    is_open: isOpen,
                    logo_url: logoUrl,
                    banner_url: bannerUrl,
                    updated_at: new Date()
                })
                .eq('id', pharmacy.id);

            if (error) throw error;
            alert('Dados salvos com sucesso! 💾');
        } catch (error: any) {
            console.error("Error saving:", error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <MerchantLayout activeTab="settings" title="Carregando...">
            <div className="flex justify-center p-12">
                <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        </MerchantLayout>
    );

    return (
        <MerchantLayout activeTab="settings" title="Configurações">
            <div className="max-w-4xl pb-20">
                <div className="mb-8">
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Minha Loja</h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Personalize como sua farmácia aparece no app.</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm mb-8">

                    {/* BANNER AREA */}
                    <div className="h-48 bg-slate-200 relative group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
                        {bannerUrl ? (
                            <img src={bannerUrl} alt="Capa" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <span className="font-bold flex items-center gap-2"><MaterialIcon name="image" /> Adicionar Capa</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold flex items-center gap-2"><MaterialIcon name="upload" /> Alterar Capa</span>
                        </div>
                        <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                    </div>

                    <div className="px-8 pb-8 relative">
                        {/* LOGO AREA - Overlaps Banner */}
                        <div className="-mt-12 mb-6 flex items-end justify-between">
                            <div className="size-32 rounded-[32px] bg-white dark:bg-zinc-800 p-2 shadow-xl relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                <div className="w-full h-full rounded-[24px] bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <MaterialIcon name="store" className="text-4xl text-slate-300" />
                                    )}
                                </div>
                                <div className="absolute inset-2 bg-black/50 rounded-[24px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MaterialIcon name="edit" className="text-white" />
                                </div>
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                            </div>

                            <div className="mb-2 text-right">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${isOpen ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                    <div className={`size-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{isOpen ? 'Online' : 'Offline'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase text-slate-500">Nome Fantasia</span>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase text-slate-500">CNPJ</span>
                                <input
                                    value={cnpj}
                                    onChange={e => setCnpj(e.target.value)}
                                    className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase text-slate-500">Telefone</span>
                                <input
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase text-slate-500">Endereço Completo</span>
                                <input
                                    disabled
                                    value={address} // Address usually comes from Profile or separate logic
                                    className="h-12 px-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-500 cursor-not-allowed"
                                />
                                <span className="text-[10px] text-slate-400">* Endereço gerido pelo cadastro inicial</span>
                            </label>

                            <div className="md:col-span-2">
                                <h3 className="text-sm font-black italic text-slate-900 dark:text-white mb-4 mt-2">Status da Loja</h3>
                                <div className="flex flex-wrap gap-4">
                                    <label className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border transition-all w-full md:w-auto ${isOpen ? 'bg-primary/10 border-primary' : 'bg-slate-50 dark:bg-black/20 border-transparent hover:border-slate-300'}`}>
                                        <input type="radio" name="status" checked={isOpen} onChange={() => setIsOpen(true)} className="accent-primary size-5" />
                                        <div>
                                            <span className="block font-bold text-sm text-slate-900 dark:text-white">Aberta</span>
                                            <span className="text-[10px] text-slate-500 uppercase font-black">Recebendo pedidos</span>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border transition-all w-full md:w-auto ${!isOpen ? 'bg-red-500/10 border-red-500' : 'bg-slate-50 dark:bg-black/20 border-transparent hover:border-slate-300'}`}>
                                        <input type="radio" name="status" checked={!isOpen} onChange={() => setIsOpen(false)} className="accent-primary size-5" />
                                        <div>
                                            <span className="block font-bold text-sm text-slate-900 dark:text-white">Fechada</span>
                                            <span className="text-[10px] text-slate-500 uppercase font-black">Não aceita pedidos</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-primary text-background-dark font-black h-12 px-8 rounded-2xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </MerchantLayout>
    );
};

export default StoreCustomization;
