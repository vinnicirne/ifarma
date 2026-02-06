import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import MerchantLayout from './MerchantLayout';
import AdminMap from '../../components/admin/AdminMap';

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
    const [isOpen, setIsOpen] = useState(true);
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');

    // Auto-message States
    const [autoMessageAcceptEnabled, setAutoMessageAcceptEnabled] = useState(false);
    const [autoMessageAcceptText, setAutoMessageAcceptText] = useState('');
    const [autoMessageCancelEnabled, setAutoMessageCancelEnabled] = useState(false);
    const [autoMessageCancelText, setAutoMessageCancelText] = useState('');

    // Address States
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

    const logoInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPharmacyData();
    }, []);

    const fetchPharmacyData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check for impersonation
            const impersonatedId = localStorage.getItem('impersonatedPharmacyId');

            let query = supabase.from('pharmacies').select('*');

            if (impersonatedId && user.email === 'admin@ifarma.com.br') { // Basic check or rely on RLS
                query = query.eq('id', impersonatedId);
            } else {
                query = query.eq('owner_id', user.id);
            }

            const { data, error } = await query.single();

            if (error) throw error;

            if (data) {
                setPharmacy(data);
                setName(data.name || '');
                setPhone(data.establishment_phone || data.phone || '');
                setCnpj(data.cnpj || '');
                setIsOpen(data.is_open ?? true);
                setLogoUrl(data.logo_url || '');
                setBannerUrl(data.banner_url || '');

                // Address
                setCep(data.zip || data.cep || '');
                setStreet(data.street || '');
                setNumber(data.number || '');
                setNeighborhood(data.neighborhood || '');
                setCity(data.city || '');
                setState(data.state || '');
                setLatitude(data.latitude?.toString() || '');
                setLongitude(data.longitude?.toString() || '');

                // Auto-messages
                setAutoMessageAcceptEnabled(data.auto_message_accept_enabled ?? false);
                setAutoMessageAcceptText(data.auto_message_accept_text || 'Olá! Recebemos seu pedido e já estamos preparando.');
                setAutoMessageCancelEnabled(data.auto_message_cancel_enabled ?? false);
                setAutoMessageCancelText(data.auto_message_cancel_text || 'Infelizmente tivemos que cancelar seu pedido por um motivo de força maior. Entre em contato para mais detalhes.');
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

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (type === 'logo') setLogoUrl(base64String);
            else setBannerUrl(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleCEPBlur = async () => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        try {
            setLoading(true);
            const viaCEPResponse = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const viaCEPData = await viaCEPResponse.json();

            if (viaCEPData.erro) {
                alert("CEP não encontrado.");
                return;
            }

            // Update Fields
            setStreet(viaCEPData.logradouro);
            setNeighborhood(viaCEPData.bairro);
            setCity(viaCEPData.localidade);
            setState(viaCEPData.uf);

            // Fetch Lat/Lng using Google Maps
            const fullAddress = `${viaCEPData.logradouro}, ${viaCEPData.number || ''} - ${viaCEPData.bairro}, ${viaCEPData.localidade} - ${viaCEPData.uf}`;
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

            if (apiKey) {
                const mapsResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`);
                const mapsData = await mapsResponse.json();
                if (mapsData.results?.[0]) {
                    setLatitude(mapsData.results[0].geometry.location.lat.toString());
                    setLongitude(mapsData.results[0].geometry.location.lng.toString());
                }
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!pharmacy) return;
        setSaving(true);

        const fullAddress = `${street}, ${number} - ${neighborhood}, ${city} - ${state}`;

        try {
            const { error } = await supabase
                .from('pharmacies')
                .update({
                    name,
                    establishment_phone: phone, // Saving to establishment_phone primarily
                    phone: phone, // Legacy sync
                    cnpj,
                    is_open: isOpen,
                    logo_url: logoUrl,
                    banner_url: bannerUrl,
                    // Address
                    address: fullAddress, // Legacy sync
                    zip: cep,
                    street,
                    number,
                    neighborhood,
                    city,
                    state,
                    latitude: parseFloat(latitude) || 0,
                    longitude: parseFloat(longitude) || 0,
                    auto_message_accept_enabled: autoMessageAcceptEnabled,
                    auto_message_accept_text: autoMessageAcceptText,
                    auto_message_cancel_enabled: autoMessageCancelEnabled,
                    auto_message_cancel_text: autoMessageCancelText,
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
                                <input value={name} onChange={e => setName(e.target.value)} className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors" />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase text-slate-500">CNPJ</span>
                                <input value={cnpj} onChange={e => setCnpj(e.target.value)} className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors" />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase text-slate-500">Telefone</span>
                                <input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors" />
                            </label>

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                                <div className="md:col-span-3">
                                    <h3 className="text-sm font-black italic text-slate-900 dark:text-white mb-4">Endereço e Localização</h3>
                                </div>
                                <label className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black uppercase text-slate-500">CEP</span>
                                    <input value={cep} onChange={e => setCep(e.target.value)} onBlur={handleCEPBlur} placeholder="00000-000" className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors" />
                                </label>
                                <label className="flex flex-col gap-1 md:col-span-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Rua / Logradouro</span>
                                    <input value={street} onChange={e => setStreet(e.target.value)} className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Número</span>
                                    <input value={number} onChange={e => setNumber(e.target.value)} className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Bairro</span>
                                    <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Cidade / UF</span>
                                    <input value={`${city} - ${state}`} readOnly className="h-12 px-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-slate-500 cursor-not-allowed" />
                                </label>

                                <div className="md:col-span-3 h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 mt-2">
                                    {latitude && longitude && !isNaN(parseFloat(latitude)) ? (
                                        <AdminMap type="tracking" markers={[{ id: 'pharma-loc', lat: parseFloat(latitude), lng: parseFloat(longitude), type: 'pharmacy' }]} />
                                    ) : (
                                        <div className="w-full h-full bg-slate-50 dark:bg-black/20 flex items-center justify-center text-slate-400 text-xs font-black uppercase">Localização não definida</div>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-4">
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

                {/* CHAT AUTOMATION SECTION */}
                <div className="bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm mb-8 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <MaterialIcon name="chat" className="text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black italic text-slate-900 dark:text-white uppercase leading-none">Automação de Chat</h3>
                            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-1">Mensagens automáticas para melhorar a experiência do cliente</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Auto-Accept Message */}
                        <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[24px] border border-slate-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="block font-black text-sm text-slate-900 dark:text-white italic">Mensagem ao Aceitar Pedido</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-black">Enviada assim que o botão "Aceitar" é clicado</span>
                                </div>
                                <button
                                    onClick={() => setAutoMessageAcceptEnabled(!autoMessageAcceptEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoMessageAcceptEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-zinc-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoMessageAcceptEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            {autoMessageAcceptEnabled && (
                                <textarea
                                    value={autoMessageAcceptText}
                                    onChange={e => setAutoMessageAcceptText(e.target.value)}
                                    className="w-full h-24 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-primary transition-colors text-sm"
                                    placeholder="Escreva sua mensagem personalizada..."
                                />
                            )}
                        </div>

                        {/* Auto-Cancel Message */}
                        <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[24px] border border-slate-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="block font-black text-sm text-slate-900 dark:text-white italic">Mensagem ao Cancelar Pedido</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-black">Enviada quando um pedido é cancelado</span>
                                </div>
                                <button
                                    onClick={() => setAutoMessageCancelEnabled(!autoMessageCancelEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoMessageCancelEnabled ? 'bg-red-500' : 'bg-slate-300 dark:bg-zinc-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoMessageCancelEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            {autoMessageCancelEnabled && (
                                <textarea
                                    value={autoMessageCancelText}
                                    onChange={e => setAutoMessageCancelText(e.target.value)}
                                    className="w-full h-24 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold italic text-slate-900 dark:text-white focus:border-red-500 transition-colors text-sm"
                                    placeholder="Escreva sua mensagem personalizada..."
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end p-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary text-background-dark font-black h-14 px-12 rounded-2xl uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Gravando...' : 'Salvar Todas as Configurações'}
                    </button>
                </div>
            </div>
        </MerchantLayout>
    );
};

export default StoreCustomization;
