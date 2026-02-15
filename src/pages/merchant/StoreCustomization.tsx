import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { isUuid } from '../../lib/uuidUtils';
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

    // Opening Hours States
    const [autoOpenStatus, setAutoOpenStatus] = useState(false);
    const [openingHoursStart, setOpeningHoursStart] = useState('08:00');
    const [openingHoursEnd, setOpeningHoursEnd] = useState('18:00');
    const [openingHours, setOpeningHours] = useState<{ day: number, open: string, close: string, closed: boolean }[]>([]);

    // Delivery Fee States
    const [deliveryFeeType, setDeliveryFeeType] = useState<'fixed' | 'km' | 'range'>('fixed');
    const [deliveryFeeFixed, setDeliveryFeeFixed] = useState(0);
    const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(0);
    const [deliveryRanges, setDeliveryRanges] = useState<{ max_km: number, fee: number }[]>([]);
    const [deliveryFreeMinKm, setDeliveryFreeMinKm] = useState(0);
    const [deliveryFreeMinValue, setDeliveryFreeMinValue] = useState(0);
    const [deliveryMaxKm, setDeliveryMaxKm] = useState(15);

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

        const handleLocalUpdate = (e: CustomEvent) => {
            // Only update if current isOpen is different to avoid loops if needed, 
            // but strictly we should trust the event.
            console.log("StoreCustomization: Received local status update", e.detail);
            setIsOpen(e.detail);
        };
        window.addEventListener('pharmacy_status_changed', handleLocalUpdate as EventListener);

        return () => window.removeEventListener('pharmacy_status_changed', handleLocalUpdate as EventListener);
    }, []);

    const fetchPharmacyData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("fetchPharmacyData: Usuário não autenticado");
                return;
            }

            console.log("fetchPharmacyData: Iniciando busca para user:", user.id, user.email);

            // Check for impersonation
            const impersonatedId = localStorage.getItem('impersonatedPharmacyId');

            let pharmacyId = null;

            // Se tiver impersonatedId, assume que é uma ação administrativa legítima
            // A segurança real deve vir das RLS do banco de dados (Admins can select all)
            if (impersonatedId && isUuid(impersonatedId)) {
                console.log("fetchPharmacyData: Admin Impersonating Mode:", impersonatedId);
                pharmacyId = impersonatedId;
            } else {
                console.log("fetchPharmacyData: Verificando se usuário é DONO...");
                // 1. Tentar encontrar farmácia onde usuário é DONO
                const { data: ownedPharmacy } = await supabase
                    .from('pharmacies')
                    .select('id')
                    .eq('owner_id', user.id)
                    .maybeSingle();

                if (ownedPharmacy) {
                    console.log("fetchPharmacyData: Usuário é DONO da farmácia:", ownedPharmacy.id);
                    pharmacyId = ownedPharmacy.id;
                } else {
                    console.log("fetchPharmacyData: Usuário não é dono. Buscando pharmacy_id no perfil (Funcionário)...");
                    // 2. Se não for dono, buscar link no perfil (Staff/Manager)
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('pharmacy_id')
                        .eq('id', user.id)
                        .single();

                    pharmacyId = profile?.pharmacy_id;
                }
            }

            if (!pharmacyId) {
                console.error('fetchPharmacyData: CRÍTICO - Nenhuma farmácia encontrada (nem como dono, nem como staff).');
                setLoading(false);
                return;
            }

            console.log("fetchPharmacyData: ID Final da Farmácia:", pharmacyId);

            const { data, error } = await supabase
                .from('pharmacies')
                .select('*')
                .eq('id', pharmacyId)
                .single();

            if (error) {
                console.error("fetchPharmacyData: Erro ao buscar dados da farmácia:", error);
                throw error;
            }

            console.log("fetchPharmacyData: Dados da farmácia carregados com sucesso:", data ? "SIM" : "NÃO");

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

                // Opening Hours
                setAutoOpenStatus(data.auto_open_status ?? false);
                setOpeningHoursStart(data.opening_hours_start || '08:00');
                setOpeningHoursEnd(data.opening_hours_end || '18:00');

                const rawHours = data.opening_hours;
                setOpeningHours(Array.isArray(rawHours) ? rawHours : []);

                // Delivery Fees
                setDeliveryFeeType(data.delivery_fee_type || 'fixed');
                setDeliveryFeeFixed(data.delivery_fee_fixed || 0);
                setDeliveryFeePerKm(data.delivery_fee_per_km || 0);

                const rawRanges = data.delivery_ranges;
                setDeliveryRanges(Array.isArray(rawRanges) ? rawRanges : []);
                setDeliveryFreeMinKm(data.delivery_free_min_km || 0);
                setDeliveryFreeMinValue(data.delivery_free_min_value || 0);
                setDeliveryMaxKm(data.delivery_max_km || 15);
            }
        } catch (error) {
            console.error("Error fetching pharmacy:", error);
        } finally {
            setLoading(false);
        }
    };

    const [uploadingFile, setUploadingFile] = useState<{ logo: boolean, banner: boolean }>({ logo: false, banner: false });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingFile(prev => ({ ...prev, [type]: true }));

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${pharmacy?.id || 'temp'}_${type}_${Date.now()}.${fileExt}`;
            const filePath = `pharmacies/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('app-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('app-assets')
                .getPublicUrl(filePath);

            if (type === 'logo') setLogoUrl(publicUrl);
            else setBannerUrl(publicUrl);
        } catch (err: any) {
            console.error('Erro no upload:', err);
            alert('Erro ao enviar imagem: ' + err.message);
        } finally {
            setUploadingFile(prev => ({ ...prev, [type]: false }));
        }
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
        if (!pharmacy) {
            console.error("handleSave: Objeto pharmacy é null ou undefined - impossível salvar.");
            return;
        }

        console.log("handleSave: Iniciando salvamento das configurações para pharmacy ID:", pharmacy.id);
        setSaving(true);

        const fullAddress = `${street}, ${number} - ${neighborhood}, ${city} - ${state}`;

        try {
            const { error } = await supabase
                .from('pharmacies')
                .update({
                    name,
                    establishment_phone: phone, // Saving to establishment_phone primarily
                    phone: phone, // Legacy sync
                    cnpj: cnpj || null,
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
                    // auto_message fields temporarily disabled (pending DB migration)
                    // auto_message_accept_enabled: autoMessageAcceptEnabled,
                    // auto_message_accept_text: autoMessageAcceptText,
                    // auto_message_cancel_enabled: autoMessageCancelEnabled,
                    // auto_message_cancel_text: autoMessageCancelText,
                    // Opening Hours
                    auto_open_status: autoOpenStatus,
                    // opening_hours_start: openingHoursStart,
                    // opening_hours_end: openingHoursEnd,
                    opening_hours: openingHours,
                    // Delivery Fees
                    delivery_fee_type: deliveryFeeType,
                    delivery_fee_fixed: deliveryFeeFixed,
                    delivery_fee_per_km: deliveryFeePerKm,
                    delivery_ranges: deliveryRanges,
                    delivery_free_min_km: deliveryFreeMinKm,
                    delivery_free_min_value: deliveryFreeMinValue,
                    delivery_max_km: deliveryMaxKm,
                    updated_at: new Date()
                })
                .eq('id', pharmacy.id);

            if (error) {
                console.error("handleSave: Erro retornado pelo supabase:", error);
                throw error;
            }

            console.log("handleSave: Configurações salvas com sucesso!");
            window.dispatchEvent(new CustomEvent('pharmacy_status_changed', { detail: isOpen }));
            alert("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("handleSave: Exception ao salvar:", error);
            alert("Erro ao salvar configurações. Verifique o console.");
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
                    <div className="h-48 bg-slate-200 relative group cursor-pointer" onClick={() => !uploadingFile.banner && bannerInputRef.current?.click()}>
                        {uploadingFile.banner ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse">
                                <MaterialIcon name="sync" className="animate-spin text-primary text-4xl" />
                            </div>
                        ) : bannerUrl ? (
                            <img src={bannerUrl} alt="Capa" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <span className="font-bold flex items-center gap-2"><MaterialIcon name="image" /> Adicionar Capa</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold flex items-center gap-2"><MaterialIcon name="upload" /> Alterar Capa</span>
                        </div>
                        <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} disabled={uploadingFile.banner} />
                    </div>

                    <div className="px-8 pb-8 relative">
                        {/* LOGO AREA - Overlaps Banner */}
                        <div className="-mt-12 mb-6 flex items-end justify-between">
                            <div className="size-32 rounded-[32px] bg-white dark:bg-zinc-800 p-2 shadow-xl relative group cursor-pointer" onClick={() => !uploadingFile.logo && logoInputRef.current?.click()}>
                                <div className="w-full h-full rounded-[24px] bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10">
                                    {uploadingFile.logo ? (
                                        <MaterialIcon name="sync" className="animate-spin text-primary text-3xl" />
                                    ) : logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <MaterialIcon name="store" className="text-4xl text-slate-300" />
                                    )}
                                </div>
                                <div className="absolute inset-2 bg-black/50 rounded-[24px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MaterialIcon name="edit" className="text-white" />
                                </div>
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} disabled={uploadingFile.logo} />
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
                                <div className="flex items-center justify-between mb-4 mt-2">
                                    <h3 className="text-sm font-black italic text-slate-900 dark:text-white">Status da Loja</h3>
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${autoOpenStatus ? 'bg-primary' : 'bg-slate-300 dark:bg-zinc-700'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoOpenStatus ? 'translate-x-4' : ''}`} />
                                            </div>
                                            <input type="checkbox" className="hidden" checked={autoOpenStatus} onChange={(e) => setAutoOpenStatus(e.target.checked)} />
                                            <span className="text-xs font-bold uppercase text-slate-500">Automático</span>
                                        </label>
                                    </div>
                                </div>

                                {autoOpenStatus ? (
                                    <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[32px] border border-slate-200 dark:border-white/5 space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Agenda Semanal</span>
                                            <button
                                                onClick={() => {
                                                    const defaultHours = [0, 1, 2, 3, 4, 5, 6].map(d => ({ day: d, open: '08:00', close: '20:00', closed: d === 0 }));
                                                    setOpeningHours(defaultHours);
                                                }}
                                                className="text-[9px] font-black uppercase text-primary hover:underline"
                                            >
                                                Redefinir Padrão
                                            </button>
                                        </div>

                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20">
                                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label, idx) => {
                                                const dayData = openingHours.find(h => h.day === idx) || { day: idx, open: '08:00', close: '20:00', closed: false };
                                                return (
                                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-white/5 transition-all hover:border-primary/20 group/day">
                                                        <div className="w-10 text-[10px] font-black uppercase text-slate-400 group-hover/day:text-primary transition-colors">{label}</div>

                                                        <button
                                                            onClick={() => {
                                                                const newHours = [...openingHours];
                                                                const index = newHours.findIndex(h => h.day === idx);
                                                                if (index >= 0) newHours[index].closed = !newHours[index].closed;
                                                                else newHours.push({ day: idx, open: '08:00', close: '20:00', closed: true });
                                                                setOpeningHours(newHours);
                                                            }}
                                                            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${dayData.closed ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}
                                                        >
                                                            {dayData.closed ? 'Fechado' : 'Aberto'}
                                                        </button>

                                                        {!dayData.closed && (
                                                            <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                                                <input
                                                                    type="time"
                                                                    value={dayData.open}
                                                                    onChange={e => {
                                                                        const newHours = [...openingHours];
                                                                        const index = newHours.findIndex(h => h.day === idx);
                                                                        if (index >= 0) newHours[index].open = e.target.value;
                                                                        else newHours.push({ day: idx, open: e.target.value, close: '20:00', closed: false });
                                                                        setOpeningHours(newHours);
                                                                    }}
                                                                    className="flex-1 h-8 bg-slate-50 dark:bg-black/40 border-none rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-primary/30"
                                                                />
                                                                <span className="text-[10px] font-black text-slate-300">às</span>
                                                                <input
                                                                    type="time"
                                                                    value={dayData.close}
                                                                    onChange={e => {
                                                                        const newHours = [...openingHours];
                                                                        const index = newHours.findIndex(h => h.day === idx);
                                                                        if (index >= 0) newHours[index].close = e.target.value;
                                                                        else newHours.push({ day: idx, open: '08:00', close: e.target.value, closed: false });
                                                                        setOpeningHours(newHours);
                                                                    }}
                                                                    className="flex-1 h-8 bg-slate-50 dark:bg-black/40 border-none rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-primary/30"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
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
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* DELIVERY CONFIGURATION SECTION */}
                <div className="bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm mb-8 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <MaterialIcon name="delivery_dining" className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black italic text-slate-900 dark:text-white uppercase leading-none">Configurações de Entrega</h3>
                            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-1">Defina como você cobra pela entrega e limites de distância</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                        {/* Seletor de Tipo - Asymmetric 4/12 Col */}
                        <div className="md:col-span-12 lg:col-span-5 space-y-6">
                            <div className="relative">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 block">Forma de Cobrança</span>
                                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-black/40 rounded-[20px] border border-slate-200 dark:border-white/5">
                                    <button
                                        onClick={() => setDeliveryFeeType('fixed')}
                                        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-[18px] transition-all duration-300 ${deliveryFeeType === 'fixed' ? 'bg-white dark:bg-zinc-800 text-primary shadow-xl shadow-black/10 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <MaterialIcon name="sell" className="text-2xl" />
                                        <span className="font-black text-[10px] uppercase tracking-widest">Taxa Fixa</span>
                                    </button>
                                    <button
                                        onClick={() => setDeliveryFeeType('km')}
                                        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-[18px] transition-all duration-300 ${deliveryFeeType === 'km' ? 'bg-white dark:bg-zinc-800 text-primary shadow-xl shadow-black/10 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <MaterialIcon name="map" className="text-2xl" />
                                        <span className="font-black text-[10px] uppercase tracking-widest">Por KM</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeliveryFeeType('range');
                                            if (deliveryRanges.length === 0) {
                                                setDeliveryRanges([
                                                    { max_km: 2, fee: 4.90 },
                                                    { max_km: 5, fee: 7.90 },
                                                    { max_km: 10, fee: 12.90 }
                                                ]);
                                            }
                                        }}
                                        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-[18px] transition-all duration-300 ${deliveryFeeType === 'range' ? 'bg-white dark:bg-zinc-800 text-primary shadow-xl shadow-black/10 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <MaterialIcon name="rule" className="text-2xl" />
                                        <span className="font-black text-[10px] uppercase tracking-widest">Faixas</span>
                                    </button>
                                </div>
                            </div>

                            <div className="relative overflow-hidden p-6 bg-slate-50 dark:bg-black/20 rounded-[24px] border border-slate-100 dark:border-white/5 group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                {deliveryFeeType === 'fixed' ? (
                                    <label className="flex flex-col gap-2 relative z-10">
                                        <span className="text-[10px] font-black uppercase text-slate-500">Valor da Taxa Fixa</span>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                                            <input
                                                type="number"
                                                value={deliveryFeeFixed}
                                                onChange={e => setDeliveryFeeFixed(parseFloat(e.target.value))}
                                                className="w-full h-14 pl-12 pr-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-black text-xl text-slate-900 dark:text-white focus:border-primary transition-all"
                                            />
                                        </div>
                                    </label>
                                ) : deliveryFeeType === 'km' ? (
                                    <label className="flex flex-col gap-2 relative z-10">
                                        <span className="text-[10px] font-black uppercase text-slate-500">Valor por KM</span>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={deliveryFeePerKm}
                                                onChange={e => setDeliveryFeePerKm(parseFloat(e.target.value))}
                                                className="w-full h-14 pl-10 pr-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-black text-xl text-slate-900 dark:text-white focus:border-primary transition-all"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">R$</span>
                                        </div>
                                    </label>
                                ) : (
                                    <div className="space-y-4 relative z-10">
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-slate-500">Faixas de Preço</span>
                                                <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Estilo iFood - Mais Atrativo</span>
                                            </div>
                                            <button
                                                onClick={() => setDeliveryRanges([...deliveryRanges, { max_km: 0, fee: 0 }])}
                                                className="text-[9px] font-black uppercase bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all"
                                            >
                                                + Faixa
                                            </button>
                                        </div>

                                        <p className="text-[9px] text-slate-400 font-bold leading-tight bg-white dark:bg-zinc-800/10 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                            Dica: Defina preços menores para clientes próximos para incentivar pedidos rápidos.
                                        </p>

                                        <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-primary/20">
                                            {deliveryRanges.length === 0 && (
                                                <div className="text-center py-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nenhuma faixa definida</span>
                                                </div>
                                            )}
                                            {deliveryRanges.map((range, idx) => (
                                                <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                placeholder="KM"
                                                                value={range.max_km}
                                                                onChange={e => {
                                                                    const newRanges = [...deliveryRanges];
                                                                    newRanges[idx].max_km = parseFloat(e.target.value);
                                                                    setDeliveryRanges(newRanges);
                                                                }}
                                                                className="w-full h-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-lg px-3 text-xs font-bold focus:border-primary outline-none"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400 uppercase">KM</span>
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                placeholder="Valor"
                                                                value={range.fee}
                                                                onChange={e => {
                                                                    const newRanges = [...deliveryRanges];
                                                                    newRanges[idx].fee = parseFloat(e.target.value);
                                                                    setDeliveryRanges(newRanges);
                                                                }}
                                                                className="w-full h-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-lg pl-6 pr-3 text-xs font-bold focus:border-primary outline-none"
                                                            />
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400">R$</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setDeliveryRanges(deliveryRanges.filter((_, i) => i !== idx))}
                                                        className="size-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                    >
                                                        <MaterialIcon name="delete" className="text-lg" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Regras e Limites - Asymmetric 8/12 Col */}
                        <div className="md:col-span-12 lg:col-span-7 grid md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-white/2 px-8 py-8 rounded-[40px] border border-slate-100 dark:border-white/5 relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

                            <label className="flex flex-col gap-2 group/field">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Raio Entrega Grátis (KM)</span>
                                <input
                                    type="number"
                                    value={deliveryFreeMinKm}
                                    onChange={e => setDeliveryFreeMinKm(parseFloat(e.target.value))}
                                    placeholder="0 = Desativado"
                                    className="h-14 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                />
                                <span className="text-[9px] text-slate-400 font-bold px-1 italic">Grátis para clientes próximos.</span>
                            </label>

                            <label className="flex flex-col gap-2 group/field">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Pedido Mín. Frete Grátis (R$)</span>
                                <input
                                    type="number"
                                    value={deliveryFreeMinValue}
                                    onChange={e => setDeliveryFreeMinValue(parseFloat(e.target.value))}
                                    placeholder="0 = Desativado"
                                    className="h-14 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                />
                                <span className="text-[9px] text-slate-400 font-bold px-1 italic">Incentivo para carrinhos maiores.</span>
                            </label>

                            <div className="md:col-span-2 pt-4 mt-2 border-t border-slate-200 dark:border-white/5">
                                <label className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Distância Máxima de Atendimento</span>
                                        <span className="text-xs font-black text-primary italic">{deliveryMaxKm} KM</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        value={deliveryMaxKm}
                                        onChange={e => setDeliveryMaxKm(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        <span>1 KM</span>
                                        <span>50 KM</span>
                                    </div>
                                </label>
                            </div>
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
