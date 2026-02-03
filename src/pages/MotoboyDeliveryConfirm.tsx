import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const MotoboyDeliveryConfirm = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [showSuccess, setShowSuccess] = useState(false);
    const [receiverName, setReceiverName] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Obter usuário e posição atual
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    }, []);

    const { latitude, longitude } = useGeolocation(userId, true);

    const handleConfirm = async () => {
        if (!receiverName.trim()) {
            alert('Por favor, informe o NOME DO RECEBEDOR para finalizar.');
            return;
        }

        setLoading(true);
        try {
            let proofUrl = null;

            // Upload Proof if exists
            if (proofFile) {
                setUploading(true);
                const fileExt = proofFile.name.split('.').pop();
                const fileName = `${orderId}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('delivery-proofs')
                    .upload(fileName, proofFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('delivery-proofs')
                    .getPublicUrl(fileName);

                proofUrl = publicUrlData.publicUrl;
                setUploading(false);
            }

            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'entregue',
                    receiver_name: receiverName,
                    proof_url: proofUrl,
                    delivery_lat: latitude,
                    delivery_lng: longitude,
                    delivered_at: new Date().toISOString(),
                })
                .eq('id', orderId);

            if (error) throw error;
            setShowSuccess(true);
        } catch (error: any) {
            console.error(error);
            alert('Erro ao confirmar entrega: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToHome = () => {
        navigate('/motoboy-dashboard');
    };

    // Custom theme constants for this specific dark/green flow
    const confirmTheme = {
        '--confirm-primary': '#13ec6d',
        '--confirm-bg-dark': '#102218',
    } as React.CSSProperties;

    return (
        <div className="bg-background-light dark:bg-[#102218] text-white font-display min-h-screen flex flex-col transition-colors duration-200" style={confirmTheme}>
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-[#102218]/80 backdrop-blur-md px-4 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <button
                    onClick={handleBackToHome}
                    className="flex items-center text-[#13ec6d] hover:text-[#13ec6d]/80 transition-colors"
                >
                    <MaterialIcon name="arrow_back_ios" className="text-2xl" />
                    <span className="text-sm font-medium">Voltar</span>
                </button>
                <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">Confirmar Entrega</h1>
                <div className="w-10"></div> {/* Spacer for balance */}
            </header>

            <main className="flex-1 overflow-y-auto pb-32">
                {/* Delivery Summary Info */}
                <div className="p-4">
                    <div className="bg-slate-200 dark:bg-white/5 rounded-xl p-4 border border-gray-300 dark:border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#13ec6d]">Pedido #{orderId?.substring(0, 8)}</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 italic italic">Informe quem recebeu o pedido para finalizar.</p>
                    </div>
                </div>

                {/* Section: Receiver Name */}
                <div className="px-4 py-2">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight mb-4">Nome do Recebedor</h3>
                    <div className="flex flex-col gap-4">
                        <label className="flex flex-col w-full">
                            <input
                                type="text"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                                className="form-input flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#13ec6d]/50 border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-4 text-lg font-bold transition-colors placeholder:font-normal"
                                placeholder="Nome de quem recebeu"
                            />
                        </label>
                    </div>
                </div>


                {/* Section: Camera / Photo Proof */}
                <div className="px-4 py-2 mt-4">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight mb-4">Comprovante (Opcional)</h3>
                    <div className="flex flex-col gap-4">
                        <label className="flex w-full items-center justify-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl bg-slate-100 dark:bg-white/5 cursor-pointer active:scale-95 transition-transform">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                            />
                            <MaterialIcon name="photo_camera" className="text-3xl text-slate-400" />
                            <span className="text-sm font-bold text-slate-500 dark:text-gray-400">
                                {proofFile ? 'Foto Selecionada' : 'Tirar Foto do Comprovante'}
                            </span>
                        </label>
                        {proofFile && (
                            <div className="relative h-32 w-full rounded-xl overflow-hidden">
                                <img src={URL.createObjectURL(proofFile)} alt="Preview" className="h-full w-full object-cover" />
                                <button
                                    onClick={() => setProofFile(null)}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                                >
                                    <MaterialIcon name="close" className="text-sm" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Tags for faster input */}
                <div className="px-4 flex flex-wrap gap-2 mt-4">
                    {['Próprio Cliente', 'Portaria', 'Secretária', 'Vizinho'].map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setReceiverName(tag)}
                            className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 dark:border-white/5 text-slate-700 dark:text-white transition-colors"
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </main>

            {/* Fixed Bottom Action Bar */}
            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/95 dark:bg-[#102218]/95 backdrop-blur-md pb-8 border-t border-gray-200 dark:border-white/5">
                <button
                    onClick={handleConfirm}
                    disabled={loading || !receiverName.trim()}
                    className="w-full bg-[#13ec6d] hover:bg-[#13ec6d]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#102218] font-bold py-4 rounded-xl text-lg shadow-lg shadow-[#13ec6d]/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                    {loading || uploading ? (
                        <span className="animate-spin text-xl">⌛</span>
                    ) : (
                        <>
                            <MaterialIcon name="check_circle" />
                            Confirmar Entrega
                        </>
                    )}
                </button>
            </footer>

            {/* Success Feedback Overlay */}
            {
                showSuccess && (
                    <div className="fixed inset-0 z-[100] bg-background-light dark:bg-[#102218] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                        <div className="w-24 h-24 bg-[#13ec6d] rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <MaterialIcon name="check" className="text-[#102218] text-6xl" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Sucesso!</h2>
                        <p className="text-slate-500 dark:text-gray-400 mb-10 max-w-xs">A entrega foi registrada com sucesso.</p>
                        <button
                            onClick={handleBackToHome}
                            className="w-full max-w-xs bg-slate-200 dark:bg-white/10 py-4 rounded-xl font-bold text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                        >
                            Voltar ao Início
                        </button>
                    </div>
                )
            }
        </div>
    );
};

export default MotoboyDeliveryConfirm;
