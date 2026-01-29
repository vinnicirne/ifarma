import { useState, useEffect } from 'react';
import { FastForward, Package, Wand2, Store, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { simulatorService } from '../../lib/simulatorService';
import { supabase } from '../../lib/supabase';

interface SystemSimulatorProps {
    onFleetUpdate: (fleet: any[]) => void;
}

const SystemSimulator = ({ onFleetUpdate }: SystemSimulatorProps) => {
    const [logs, setLogs] = useState<{ id: number; text: string; type: 'success' | 'info' | 'error' }[]>([]);
    const [activeOrders, setActiveOrders] = useState<string[]>([]);
    const [autoAdvance, setAutoAdvance] = useState(false);

    const addLog = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
        setLogs(prev => [{ id: Date.now(), text, type }, ...prev].slice(0, 5));
    };

    // 1. Simulação de Pedido Completo
    const simulateOrderFlow = async () => {
        setIsLoading(true);
        addLog('Iniciando simulação de fluxo de cliente...', 'info');

        const result = await simulatorService.simulateCompleteOrder();

        if (result.success) {
            addLog(`Novo Pedido #${result.orderId?.substring(0, 8)} criado!`, 'success');
            addLog(`Cliente: ${result.customer} | Loja: ${result.pharmacy} | Total: R$ ${result.total}`, 'info');

            if (result.orderId) {
                setActiveOrders(prev => [...prev, result.orderId!]);
            }
        } else {
            addLog(`Erro ao criar pedido: ${result.error}`, 'error');
        }

        setIsLoading(false);
    };

    // 2. Simular Cadastro de Nova Loja
    const simulatePharmaRegistration = async () => {
        setIsLoading(true);
        addLog('Simulando novo cadastro de farmácia parceira...', 'info');

        const result = await simulatorService.simulateNewPharmacyRegistration();

        if (result.success) {
            addLog(`Nova farmácia "${result.pharmacy.name}" cadastrada como Pendente!`, 'success');
        } else {
            addLog(`Erro no cadastro: ${result.error}`, 'error');
        }

        setIsLoading(false);
    };

    const simulateClosedPharmaAttempt = async () => {
        setIsLoading(true);
        addLog('Simulando tentativa de pedido em farmácia fechada...', 'info');

        const { data: pharms } = await supabase.from('pharmacies').select('name').limit(1);
        const pharmaName = pharms?.[0]?.name || 'Farmácia do Centro';

        const { error } = await supabase.from('system_alerts').insert({
            type: 'pharmacy_closed_attempt',
            severity: 'warning',
            region: pharmaName,
            message: `Usuário tentou iniciar pedido na loja "${pharmaName}", mas a loja está fechada. Venda perdida em potencial.`
        });

        if (!error) {
            addLog(`Alerta de farmácia fechada gerado para "${pharmaName}"!`, 'success');
        } else {
            addLog(`Erro ao gerar alerta: ${error.message}`, 'error');
        }

        setIsLoading(false);
    };

    // 3. Avanço Automático de Status
    useEffect(() => {
        if (!autoAdvance || activeOrders.length === 0) return;

        const interval = setInterval(async () => {
            const nextOrderId = activeOrders[0];
            if (!nextOrderId) return;

            const result = await simulatorService.advanceOrderStatus(nextOrderId);

            if (result.success) {
                addLog(`Pedido #${nextOrderId.substring(0, 8)} movido para: ${result.newStatus}`, 'success');
                if (result.newStatus === 'entregue') {
                    setActiveOrders(prev => prev.filter(id => id !== nextOrderId));
                }
            } else {
                // Se não pôde avançar, remove da fila de auto-avanço
                setActiveOrders(prev => prev.filter(id => id !== nextOrderId));
            }
        }, 5000); // Avança a cada 5 segundos para fins de teste

        return () => clearInterval(interval);
    }, [autoAdvance, activeOrders]);

    // 4. Simulação de Frota (Herdada do anterior, mas integrada)
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wand2 size={80} className="text-primary" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FastForward size={18} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-white text-xl font-[900] italic tracking-tight">System Simulator v2.0</h3>
                            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest text-[#92c9a9]">Simulação Total do Ecossistema</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-black uppercase">Auto-Status</span>
                        <button
                            onClick={() => setAutoAdvance(!autoAdvance)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${autoAdvance ? 'bg-primary' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${autoAdvance ? 'left-5' : 'left-1'}`}></div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={simulateOrderFlow}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center gap-2 bg-white text-slate-900 h-24 rounded-3xl font-black italic text-xs uppercase tracking-tight hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Package size={24} />
                        {isLoading ? 'Gerando...' : 'Fluxo Pedido'}
                    </button>

                    <button
                        onClick={simulatePharmaRegistration}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center gap-2 bg-slate-800 text-white h-24 rounded-3xl font-black italic text-xs uppercase tracking-tight hover:bg-slate-700 transition-all active:scale-95 border border-white/5"
                    >
                        <Store size={24} className="text-primary" />
                        Nova Farmácia
                    </button>

                    <button
                        onClick={simulateClosedPharmaAttempt}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center gap-2 bg-red-900/20 text-red-500 h-24 rounded-3xl font-black italic text-xs uppercase tracking-tight hover:bg-red-900/30 transition-all active:scale-95 border border-red-500/20"
                    >
                        <AlertCircle size={24} />
                        Alerta Falha
                    </button>
                </div>

                {/* LOGS PANEL */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                            <RefreshCw size={10} className={isLoading ? 'animate-spin text-primary' : ''} />
                            Logs de Atividade
                        </span>
                        <button onClick={() => setLogs([])} className="text-[8px] text-slate-500 hover:text-white uppercase font-black">Limpar</button>
                    </div>
                    <div className="bg-black/40 rounded-3xl border border-white/5 p-4 min-h-[140px] space-y-2">
                        {logs.length === 0 ? (
                            <div className="h-full flex items-center justify-center flex-col gap-2 opacity-20 py-8">
                                <Wand2 size={24} />
                                <span className="text-[10px] font-bold">Aguardando ações...</span>
                            </div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="flex items-start gap-2 text-[11px] font-bold animate-in slide-in-from-left duration-300">
                                    {log.type === 'success' && <CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" />}
                                    {log.type === 'error' && <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />}
                                    {log.type === 'info' && <RefreshCw size={12} className="text-blue-400 shrink-0 mt-0.5" />}
                                    <span className={log.type === 'error' ? 'text-red-400' : 'text-slate-300 italic'}>{log.text}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                        <span className="text-primary">TIP:</span> Ative o "Auto-Status" para ver o pedido avançar sozinho até o estado de 'entregue', simulando o trabalho do logista e do motoboy.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SystemSimulator;
