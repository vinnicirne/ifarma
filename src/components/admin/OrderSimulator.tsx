import { useState, useEffect } from 'react';
import { Play, Square, FastForward, Package, Bike, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderSimulatorProps {
    onFleetUpdate: (fleet: any[]) => void;
}

const OrderSimulator = ({ onFleetUpdate }: OrderSimulatorProps) => {
    const [isSimulatingFleet, setIsSimulatingFleet] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 1. Simulação de Novo Pedido (Demanda Aleatória)
    const simulateOrder = async () => {
        setIsLoading(true);
        const customers = ['Vinicius Admin', 'Joana Teste', 'Marcela Pharma', 'Carlos Cliente', 'Bruna Santos'];
        const regions = ['Copacabana', 'Ipanema', 'Centro', 'Niterói', 'São Gonçalo'];

        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        const randomPrice = (Math.random() * (150 - 20) + 20).toFixed(2);

        try {
            // Buscar uma farmácia existente para o pedido ser válido
            const { data: pharmacies } = await supabase.from('pharmacies').select('id').limit(1);

            if (!pharmacies || pharmacies.length === 0) {
                alert('Cadastre pelo menos uma farmácia para simular pedidos!');
                return;
            }

            const { data: newOrder, error } = await supabase
                .from('orders')
                .insert([{
                    customer_name: randomCustomer,
                    address: `${regions[Math.floor(Math.random() * regions.length)]}, Rio de Janeiro`,
                    total_price: parseFloat(randomPrice),
                    status: 'pendente',
                    pharmacy_id: pharmacies[0].id,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            // Simular Itens do Pedido
            if (newOrder) {
                const { data: products } = await supabase.from('products').select('*').limit(3);
                if (products && products.length > 0) {
                    const items = products.map(p => ({
                        order_id: newOrder.id,
                        product_id: p.id,
                        quantity: Math.floor(Math.random() * 3) + 1,
                        price: (Math.random() * 50 + 10).toFixed(2)
                    }));
                    await supabase.from('order_items').insert(items);
                }
            }
        } catch (err) {
            console.error('Erro ao simular pedido:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Simulação de Frota Móvel (Movimentação Automática)
    useEffect(() => {
        if (!isSimulatingFleet) {
            onFleetUpdate([]);
            return;
        }

        const runFleetSim = async () => {
            const center = { lat: -22.9068, lng: -43.1729 };

            // Buscar 3 últimos pedidos para vincular aos motoboys
            const { data: recentOrders } = await supabase
                .from('orders')
                .select('id')
                .order('created_at', { ascending: false })
                .limit(3);

            let moboys = [
                { id: 'sim-1', lat: center.lat + 0.01, lng: center.lng + 0.01, currentOrderId: recentOrders?.[0]?.id },
                { id: 'sim-2', lat: center.lat - 0.01, lng: center.lng - 0.01, currentOrderId: recentOrders?.[1]?.id },
                { id: 'sim-3', lat: center.lat + 0.02, lng: center.lng - 0.02, currentOrderId: recentOrders?.[2]?.id },
            ];

            const interval = setInterval(() => {
                moboys = moboys.map(m => ({
                    ...m,
                    lat: m.lat + (Math.random() - 0.5) * 0.002,
                    lng: m.lng + (Math.random() - 0.5) * 0.002
                }));
                onFleetUpdate([...moboys]);
            }, 1000);

            return interval;
        };

        const intervalPromise = runFleetSim();

        return () => {
            intervalPromise.then(interval => clearInterval(interval));
        };
    }, [isSimulatingFleet, onFleetUpdate]);

    return (
        <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wand2 size={80} className="text-primary" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FastForward size={18} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-white text-xl font-[900] italic tracking-tight">Simulador Beta</h3>
                        <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest">Teste de estresse e visualização</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={simulateOrder}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-3 bg-white text-slate-900 h-14 rounded-2xl font-black italic text-sm uppercase tracking-tight hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Package size={18} />
                        {isLoading ? 'Gerando...' : 'Gerar Pedido'}
                    </button>

                    <button
                        onClick={() => setIsSimulatingFleet(!isSimulatingFleet)}
                        className={`flex items-center justify-center gap-3 h-14 rounded-2xl font-black italic text-sm uppercase tracking-tight transition-all active:scale-95 border-2 ${isSimulatingFleet
                            ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_#13ec6d30]'
                            : 'bg-transparent border-white/10 text-white hover:border-white/20'
                            }`}
                    >
                        <Bike size={18} />
                        {isSimulatingFleet ? 'Parar Frota' : 'Simular Frota'}
                    </button>
                </div>

                <div className="mt-6 p-4 bg-black/20 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                        <span className="text-primary">TIP:</span> Use o simulador para validar se as atualizações em tempo real (Real-time) estão funcionando corretamente no mapa e nos KPIs.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OrderSimulator;
