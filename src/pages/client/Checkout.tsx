import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// Material Icon Component
const MaterialIcon = ({ name, className = '' }: { name: string; className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const Checkout = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [pharmacyId, setPharmacyId] = useState<string>('');
    const [paymentSettings, setPaymentSettings] = useState<any>(null);
    const [selectedPayment, setSelectedPayment] = useState<string>('');
    const [installments, setInstallments] = useState(1);
    const [address, setAddress] = useState('');
    const [addresses, setAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [needsChange, setNeedsChange] = useState(false);
    const [changeFor, setChangeFor] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [distance, setDistance] = useState<number | null>(null);
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [isOutOfRange, setIsOutOfRange] = useState(false);
    const [complement, setComplement] = useState('');
    const [observation, setObservation] = useState('');

    useEffect(() => {
        fetchCartAndSettings();
    }, []);

    const fetchCartAndSettings = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/login');
            return;
        }

        // Buscar itens do carrinho
        const { data: cart } = await supabase
            .from('cart_items')
            .select('*, products(*, pharmacies(*))')
            .eq('customer_id', session.user.id);

        if (cart && cart.length > 0) {
            // Verificação de segurança: todos os itens devem ser da mesma farmácia
            const pharmacies = new Set(cart.map(item => item.products.pharmacy_id));
            if (pharmacies.size > 1) {
                alert('Erro: Seu carrinho contém itens de múltiplas farmácias. Por favor, limpe o carrinho e adicione itens de apenas uma loja por vez.');
                navigate('/cart');
                return;
            }

            setCartItems(cart);
            const t = cart.reduce((acc, item) => acc + (Number(item.products.price) * item.quantity), 0);
            setTotal(t);

            // Pegar pharmacy_id do primeiro item (agora garantido ser único)
            const pharmId = cart[0].products.pharmacy_id;
            setPharmacyId(pharmId);

            // Buscar configurações de pagamento da farmácia
            const { data: settings } = await supabase
                .from('pharmacy_payment_settings')
                .select('*')
                .eq('pharmacy_id', pharmId)
                .single();

            if (settings) {
                setPaymentSettings(settings);
                // Selecionar primeiro método disponível
                if (settings.accepts_pix) setSelectedPayment('pix');
                else if (settings.accepts_cash) setSelectedPayment('cash');
                else if (settings.accepts_debit) setSelectedPayment('debit');
                else if (settings.accepts_credit) setSelectedPayment('credit');
            }

            // Buscar dados extras da farmácia (taxas)
            const pharmData = cart[0].products.pharmacies;
            setPharmacy(pharmData);
        }

        // 1. Buscar endereço do perfil (Principal)
        const { data: profile } = await supabase
            .from('profiles')
            .select('address, latitude, longitude')
            .eq('id', session.user.id)
            .single();

        // 2. Buscar todos os endereços salvos na user_addresses
        const { data: userAddresses } = await supabase
            .from('user_addresses')
            .select('*')
            .eq('user_id', session.user.id);

        let allPossibleAddresses: any[] = [];

        // Adicionar endereço do perfil como "Principal" se existir
        if (profile?.address) {
            allPossibleAddresses.push({
                id: 'profile_main',
                name: 'Principal',
                street: profile.address, // Já vem completo do UserProfile.tsx
                latitude: profile.latitude,
                longitude: profile.longitude,
                is_default: !userAddresses || userAddresses.every(a => !a.is_default)
            });
        }

        if (userAddresses && userAddresses.length > 0) {
            const mapped = userAddresses.map(a => {
                // Para user_addresses, precisamos concatenar
                let full = a.street || a.address || '';
                if (a.number && !full.includes(a.number)) full += `, ${a.number}`;
                return { ...a, street: full }; // Normalizar para exibir no UI
            });
            allPossibleAddresses = [...allPossibleAddresses, ...mapped];
        }

        setAddresses(allPossibleAddresses);

        // Selecionar o padrão ou o primeiro disponível
        const defaultAddr = allPossibleAddresses.find(a => a.is_default) || allPossibleAddresses[0];
        if (defaultAddr) {
            setAddress(defaultAddr.street);
            setSelectedAddressId(defaultAddr.id);
            setComplement(defaultAddr.complement || '');
            // Se for do perfil, talvez o complemento já esteja na string, mas deixamos vazio ou extraímos
        }
    };

    // Helper: Haversine distance
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Logic: Calculate Delivery Fee when Address or Cart changes
    useEffect(() => {
        if (!pharmacy || !selectedAddressId || addresses.length === 0) {
            setDeliveryFee(0);
            return;
        }

        const selectedAddr = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddr || !selectedAddr.latitude) return;

        const dist = calculateDistance(
            pharmacy.latitude,
            pharmacy.longitude,
            selectedAddr.latitude,
            selectedAddr.longitude
        );

        setDistance(dist);

        // Check range
        if (pharmacy.delivery_max_km > 0 && dist > pharmacy.delivery_max_km) {
            setIsOutOfRange(true);
            setDeliveryFee(0);
            return;
        } else {
            setIsOutOfRange(false);
        }

        // Apply Rules
        let fee = 0;

        // 1. Check Free Value
        const isFreeValue = pharmacy.delivery_free_min_value > 0 && total >= pharmacy.delivery_free_min_value;
        // 2. Check Free Distance
        const isFreeDist = pharmacy.delivery_free_min_km > 0 && dist <= pharmacy.delivery_free_min_km;

        if (isFreeValue || isFreeDist) {
            fee = 0;
        } else {
            if (pharmacy.delivery_fee_type === 'km') {
                fee = dist * (pharmacy.delivery_fee_per_km || 0);
            } else if (pharmacy.delivery_fee_type === 'range' && pharmacy.delivery_ranges?.length > 0) {
                const ranges = [...pharmacy.delivery_ranges].sort((a, b) => a.max_km - b.max_km);
                const match = ranges.find(r => dist <= r.max_km);
                fee = match ? match.fee : (ranges[ranges.length - 1].fee || 0);
            } else {
                fee = pharmacy.delivery_fee_fixed || 0;
            }
        }

        setDeliveryFee(fee);
    }, [selectedAddressId, total, pharmacy, addresses]);

    const getAvailableInstallments = () => {
        if (!paymentSettings || selectedPayment !== 'credit') return [1];
        if (total < paymentSettings.min_installment_value) return [1];

        const max = Math.min(
            paymentSettings.max_installments,
            Math.floor(total / paymentSettings.min_installment_value)
        );

        return Array.from({ length: max }, (_, i) => i + 1);
    };

    const handleConfirmOrder = async () => {
        if (!selectedPayment) {
            alert('Selecione um método de pagamento');
            return;
        }

        if (!address) {
            alert('Adicione um endereço de entrega');
            return;
        }

        if (isOutOfRange) {
            alert(`Sua localização está fora do raio de entrega desta farmácia (${pharmacy?.delivery_max_km}km).`);
            return;
        }

        if (paymentSettings && total < paymentSettings.min_order_value) {
            alert(`Valor mínimo do pedido: R$ ${paymentSettings.min_order_value.toFixed(2)}`);
            return;
        }

        // Validação de Troco
        if (selectedPayment === 'cash' && needsChange) {
            if (changeFor < total) {
                alert('O valor para troco deve ser maior que o total do pedido.');
                return;
            }
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada');

            // Criar pedido
            const selectedAddrObj = addresses.find(a => (a.street || a.address) === address);

            const payload: any = {
                customer_id: session.user.id,
                pharmacy_id: pharmacyId,
                total_price: total + deliveryFee, // Soma a taxa ao total
                delivery_fee: deliveryFee, // Campo para auditoria
                payment_method: selectedPayment,
                installments: selectedPayment === 'credit' ? installments : 1,
                address: address,
                complement: complement,
                customer_notes: observation,
                latitude: selectedAddrObj?.latitude || 0,
                longitude: selectedAddrObj?.longitude || 0,
                status: 'pendente'
            };

            // Adicionar change_for se for dinheiro e precisar
            if (selectedPayment === 'cash' && needsChange && changeFor > 0) {
                payload.change_for = changeFor;
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert(payload)
                .select()
                .single();

            if (orderError) throw orderError;

            // Criar itens do pedido
            const orderItems = cartItems.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.products.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Limpar carrinho
            await supabase
                .from('cart_items')
                .delete()
                .eq('customer_id', session.user.id);

            // Navegar para rastreamento
            navigate(`/order-tracking/${order.id}`);

        } catch (error: any) {
            console.error('Erro ao criar pedido:', error);
            alert('Erro ao processar pedido: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const paymentMethods = [
        { id: 'pix', name: 'PIX', icon: 'qr_code', enabled: paymentSettings ? paymentSettings.accepts_pix : true },
        { id: 'cash', name: 'Dinheiro', icon: 'payments', enabled: paymentSettings ? paymentSettings.accepts_cash : true },
        { id: 'debit', name: 'Débito', icon: 'credit_card', enabled: paymentSettings ? paymentSettings.accepts_debit : true },
        { id: 'credit', name: 'Crédito', icon: 'credit_card', enabled: paymentSettings ? paymentSettings.accepts_credit : true }
    ];

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-[480px] mx-auto overflow-x-hidden pb-10 bg-background-light dark:bg-background-dark font-display text-[#0d1b13] dark:text-white antialiased">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer transition-colors hover:opacity-70">
                    <MaterialIcon name="arrow_back_ios" />
                </button>
                <h2 className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Finalizar Pedido</h2>
            </header>

            <main className="flex-1 flex flex-col gap-4 p-4 pb-48">
                {/* Endereço de Entrega (Seleção Inteligente) */}
                <div className="bg-white dark:bg-background-dark/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Endereço de Entrega</h3>
                        <button
                            onClick={() => navigate('/profile')}
                            className="text-primary text-xs font-bold flex items-center gap-1"
                        >
                            <MaterialIcon name="add" className="text-sm" />
                            Novo
                        </button>
                    </div>

                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-4">
                        {addresses.map((addr) => (
                            <button
                                key={addr.id}
                                onClick={() => {
                                    setAddress(addr.street);
                                    setSelectedAddressId(addr.id);
                                    setComplement(addr.complement || '');
                                }}
                                className={`flex flex-col min-w-[160px] p-3 rounded-xl border-2 transition-all ${selectedAddressId === addr.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <MaterialIcon
                                        name={
                                            addr.id === 'profile_main' ? 'person' :
                                                (addr.name || addr.label) === 'Trabalho' ? 'work' : 'home'
                                        }
                                        className={`text-sm ${selectedAddressId === addr.id ? 'text-primary' : 'text-slate-400'}`}
                                    />
                                    <span className="text-xs font-bold uppercase truncate">{addr.name || addr.label || 'Endereço'}</span>
                                </div>
                                <p className="text-[10px] text-left line-clamp-2 opacity-70">{addr.street}</p>
                            </button>
                        ))}
                    </div>

                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest px-1">Endereço de entrega</p>
                    <div className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-medium shadow-sm transition-all flex items-start gap-3">
                        <div className="mt-1 flex items-center justify-center size-8 bg-primary/10 text-primary rounded-lg shrink-0">
                            <MaterialIcon name="location_on" className="text-xl" />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <p className="text-slate-900 dark:text-white font-black text-base leading-tight italic">
                                {address || <span className="text-slate-400">Nenhum endereço selecionado</span>}
                            </p>
                            {complement && (
                                <p className="text-primary text-[11px] font-bold uppercase mt-1 tracking-wider flex items-center gap-1">
                                    <MaterialIcon name="info" className="text-[14px]" />
                                    {complement}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Observações p/ o Entregador</label>
                            <textarea
                                value={observation}
                                onChange={(e) => setObservation(e.target.value)}
                                placeholder="Ex: Tocar a campainha, deixar na portaria, ponto de referência..."
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm resize-none font-medium h-24 outline-none focus:border-primary transition-all focus:bg-white dark:focus:bg-slate-900 shadow-sm"
                            />
                        </div>

                        {/* Complemento as optional/secondary if not already in main address */}
                        <div className="flex items-center gap-2 group">
                            <MaterialIcon name="add_circle" className="text-primary text-sm" />
                            <input
                                type="text"
                                value={complement}
                                onChange={(e) => setComplement(e.target.value)}
                                placeholder="Editar complemento (opcional)"
                                className="flex-1 bg-transparent border-none text-[11px] font-bold uppercase text-slate-400 focus:text-primary outline-none tracking-widest transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Resumo do Pedido - Premium Refined Layout */}
                <div className="bg-white dark:bg-zinc-900/40 rounded-[32px] p-6 border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-primary/10"></div>

                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                        Resumo do Pedido
                    </h3>

                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center group/item transition-all hover:translate-x-1">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Subtotal</span>
                            <span className="font-black text-lg">R$ {total.toFixed(2)}</span>
                        </div>

                        {distance !== null && (
                            <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-black/20 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
                                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <MaterialIcon name="route" className="text-sm" />
                                    Distância
                                </span>
                                <span className="text-xs font-bold italic text-primary">{distance.toFixed(1)} km</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center group/item transition-all hover:translate-x-1">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Taxa de Entrega</span>
                                {deliveryFee === 0 && (
                                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Oferta Ativa</span>
                                )}
                            </div>
                            {deliveryFee === 0 ? (
                                <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                    <span className="font-black text-green-500 text-xs">GRÁTIS</span>
                                </div>
                            ) : (
                                <span className="font-black text-lg">R$ {deliveryFee.toFixed(2)}</span>
                            )}
                        </div>

                        {isOutOfRange && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-bounce">
                                <MaterialIcon name="error" className="text-red-500" />
                                <span className="text-[10px] text-red-500 font-black uppercase tracking-tight">Fora do raio de entrega</span>
                            </div>
                        )}

                        {paymentSettings && total < paymentSettings.min_order_value && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-3">
                                <MaterialIcon name="warning" className="text-orange-500" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-orange-500 font-black uppercase tracking-tight">Pedido Mínimo não atingido</span>
                                    <span className="text-[9px] text-orange-400 font-bold">Faltam R$ {(paymentSettings.min_order_value - total).toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 mt-2 border-t-2 border-dashed border-gray-100 dark:border-white/5">
                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Valor Total</span>
                                    <span className="text-sm text-gray-400 line-through opacity-50">
                                        R$ {(total + deliveryFee + 4.90).toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] font-black text-primary uppercase">Economia no App</span>
                                    <span className="text-3xl font-black italic tracking-tighter text-primary">
                                        R$ {(total + deliveryFee).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Métodos de Pagamento */}
                <div className="bg-white dark:bg-background-dark/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Método de Pagamento</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.filter(m => m.enabled).map((method) => (
                            <button
                                key={method.id}
                                onClick={() => setSelectedPayment(method.id)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${selectedPayment === method.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                    }`}
                            >
                                <MaterialIcon name={method.icon} className={`text-3xl ${selectedPayment === method.id ? 'text-primary' : 'text-gray-400'}`} />
                                <span className="text-sm font-bold">{method.name}</span>
                            </button>
                        ))}
                    </div>

                    {selectedPayment === 'pix' && (
                        <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <MaterialIcon name="info" className="text-primary" />
                            <div className="flex flex-col">
                                <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Pagamento na Entrega</p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                    O pagamento via <strong>PIX</strong> será realizado diretamente na maquininha que o entregador levará até você.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Parcelamento (apenas para crédito) */}
                {selectedPayment === 'credit' && getAvailableInstallments().length > 1 && (
                    <div className="bg-white dark:bg-background-dark/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 animate-fade-in">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Parcelamento</h3>
                        <select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold"
                        >
                            {getAvailableInstallments().map((num) => (
                                <option key={num} value={num}>
                                    {num}x de R$ {(total / num).toFixed(2)} {num === 1 ? '(à vista)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Troco (apenas para dinheiro) */}
                {selectedPayment === 'cash' && (
                    <div className="bg-white dark:bg-background-dark/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 animate-fade-in">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Troco</h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={needsChange}
                                    onChange={(e) => {
                                        setNeedsChange(e.target.checked);
                                        if (!e.target.checked) setChangeFor(0);
                                    }}
                                    className="accent-primary size-5"
                                />
                                <span className="text-sm font-bold text-slate-700 dark:text-white">Preciso de troco</span>
                            </label>

                            {needsChange && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Troco para quanto?</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-slate-500 font-bold">R$</span>
                                        <input
                                            type="number"
                                            value={changeFor || ''}
                                            onChange={(e) => setChangeFor(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-primary"
                                            placeholder="Ex: 50.00"
                                        />
                                    </div>
                                    {changeFor > 0 && changeFor < total && (
                                        <p className="text-xs text-red-500 font-bold mt-1">O valor deve ser maior que o total (R$ {total.toFixed(2)})</p>
                                    )}
                                    {changeFor >= total && (
                                        <p className="text-xs text-green-500 font-bold mt-1">
                                            Seu troco será: R$ {(changeFor - total).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Botão Confirmar */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 pb-8 z-50">
                <button
                    onClick={handleConfirmOrder}
                    disabled={loading || !selectedPayment}
                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-4 bg-primary text-white gap-3 text-base font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    <span className="truncate">{loading ? 'Processando...' : 'Confirmar Pedido'}</span>
                    {!loading && <MaterialIcon name="check_circle" />}
                </button>
            </div>
        </div>
    );
};

export default Checkout;
