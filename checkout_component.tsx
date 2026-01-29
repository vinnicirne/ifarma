// Componente Checkout - Inserir no App.tsx antes do UserOrderTracking (linha 1190)

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
            setCartItems(cart);
            const t = cart.reduce((acc, item) => acc + (Number(item.products.price) * item.quantity), 0);
            setTotal(t);

            // Pegar pharmacy_id do primeiro item (assumindo que todos são da mesma farmácia)
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
        }

        // Buscar endereço do perfil
        const { data: profile } = await supabase
            .from('profiles')
            .select('address')
            .eq('id', session.user.id)
            .single();

        if (profile?.address) {
            setAddress(profile.address);
        }
    };

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

        if (paymentSettings && total < paymentSettings.min_order_value) {
            alert(`Valor mínimo do pedido: R$ ${paymentSettings.min_order_value.toFixed(2)}`);
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada');

            // Criar pedido
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_id: session.user.id,
                    pharmacy_id: pharmacyId,
                    total_price: total,
                    payment_method: selectedPayment,
                    installments: selectedPayment === 'credit' ? installments : 1,
                    address: address,
                    status: 'pendente'
                })
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
        { id: 'pix', name: 'PIX', icon: 'qr_code', enabled: paymentSettings?.accepts_pix },
        { id: 'cash', name: 'Dinheiro', icon: 'payments', enabled: paymentSettings?.accepts_cash },
        { id: 'debit', name: 'Débito', icon: 'credit_card', enabled: paymentSettings?.accepts_debit },
        { id: 'credit', name: 'Crédito', icon: 'credit_card', enabled: paymentSettings?.accepts_credit }
    ];

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-[480px] mx-auto overflow-x-hidden pb-32 bg-background-light dark:bg-background-dark font-display text-[#0d1b13] dark:text-white antialiased">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer transition-colors hover:opacity-70">
                    <MaterialIcon name="arrow_back_ios" />
                </button>
                <h2 className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Finalizar Pedido</h2>
            </header>

            <main className="flex-1 flex flex-col gap-4 p-4">
                {/* Endereço de Entrega */}
                <div className="bg-white dark:bg-background-dark/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Endereço de Entrega</h3>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Digite seu endereço completo"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm resize-none"
                        rows={3}
                    />
                </div>

                {/* Resumo do Pedido */}
                <div className="bg-white dark:bg-background-dark/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Resumo do Pedido</h3>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                        <span className="font-bold">R$ {total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Taxa de Entrega</span>
                        <span className="font-bold text-primary">GRÁTIS</span>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-3"></div>
                    <div className="flex justify-between">
                        <span className="text-lg font-bold">Total</span>
                        <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
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
                </div>

                {/* Parcelamento (apenas para crédito) */}
                {selectedPayment === 'credit' && getAvailableInstallments().length > 1 && (
                    <div className="bg-white dark:bg-background-dark/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
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
