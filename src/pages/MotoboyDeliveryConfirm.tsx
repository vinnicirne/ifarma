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
    const [uploading, setUploading] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Obter usuário e posição atual
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    }, []);

    const { latitude, longitude } = useGeolocation(userId, true);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${orderId}_${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('deliveries')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('deliveries')
                .getPublicUrl(filePath);

            setPhotoUrl(publicUrl);
        } catch (error: any) {
            alert('Erro no upload: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = async () => {
        if (!photoUrl) {
            alert('A foto de comprovação é obrigatória para finalizar a entrega.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'Delivered',
                    delivery_photo_url: photoUrl,
                    delivery_lat: latitude,
                    delivery_lng: longitude,
                    delivered_at: new Date().toISOString(),
                    customer_notes: notes // Or another field for delivery notes
                })
                .eq('id', orderId);

            if (error) throw error;
            setShowSuccess(true);
        } catch (error: any) {
            alert('Erro ao confirmar entrega: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToHome = () => {
        navigate('/motoboy-orders'); // Assuming this goes back to orders list
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
                    onClick={() => navigate(-1)}
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
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 italic italic">Confirme a entrega tirando uma foto do local ou do recebedor.</p>
                    </div>
                </div>

                {/* Section: Proof (Optional) */}
                <div className="px-4 py-2">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight mb-4">Comprovação (Obrigatória)</h3>
                    <div className="flex flex-col">
                        <label className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[#13ec6d]/30 bg-[#13ec6d]/5 px-6 py-10 transition-all hover:bg-[#13ec6d]/10 cursor-pointer overflow-hidden relative">
                            {uploading ? (
                                <div className="animate-spin size-10 border-4 border-[#13ec6d] border-t-transparent rounded-full"></div>
                            ) : photoUrl ? (
                                <img src={photoUrl} alt="Comprovante" className="max-h-40 rounded-lg shadow-lg" />
                            ) : (
                                <>
                                    <div className="bg-[#13ec6d]/20 p-4 rounded-full">
                                        <MaterialIcon name="add_a_photo" className="text-[#13ec6d] text-3xl" />
                                    </div>
                                    <div className="flex max-w-[480px] flex-col items-center gap-1">
                                        <p className="text-slate-900 dark:text-white text-base font-bold leading-tight tracking-tight text-center">Foto do Comprovante</p>
                                        <p className="text-slate-500 dark:text-gray-400 text-sm font-normal leading-normal text-center">Tire uma foto do canhoto ou do local da entrega</p>
                                    </div>
                                </>
                            )}
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                    </div>
                </div>

                {/* Section: Observations */}
                <div className="px-4 py-4">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight mb-4">Observações</h3>
                    <div className="flex flex-col gap-4">
                        <label className="flex flex-col w-full">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#13ec6d]/50 border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 min-h-36 placeholder:text-slate-400 dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal transition-colors"
                                placeholder="Ex: Entregue para o porteiro Sr. João"
                            ></textarea>
                        </label>
                    </div>
                </div>

                {/* Quick Tags for faster input */}
                <div className="px-4 flex flex-wrap gap-2">
                    {['Entregue ao próprio', 'Deixado na portaria', 'Vizinho recebeu'].map((tag) => (
                        <button key={tag} className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 dark:border-white/5 text-slate-700 dark:text-white transition-colors">
                            {tag}
                        </button>
                    ))}
                </div>
            </main>

            {/* Fixed Bottom Action Bar */}
            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/95 dark:bg-[#102218]/95 backdrop-blur-md pb-8 border-t border-gray-200 dark:border-white/5">
                <button
                    onClick={handleConfirm}
                    disabled={loading || uploading}
                    className="w-full bg-[#13ec6d] hover:bg-[#13ec6d]/90 disabled:opacity-50 text-[#102218] font-bold py-4 rounded-xl text-lg shadow-lg shadow-[#13ec6d]/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                    {loading ? (
                        <span className="animate-spin text-xl">⌛</span>
                    ) : (
                        <>
                            <MaterialIcon name="check_circle" />
                            Finalizar Entrega (POD)
                        </>
                    )}
                </button>
            </footer>

            {/* Success Feedback Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] bg-background-light dark:bg-[#102218] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                    <div className="w-24 h-24 bg-[#13ec6d] rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <MaterialIcon name="check" className="text-[#102218] text-6xl" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Sucesso!</h2>
                    <p className="text-slate-500 dark:text-gray-400 mb-10 max-w-xs">A entrega do pedido #4829 foi confirmada no sistema da farmácia.</p>
                    <button
                        onClick={handleBackToHome}
                        className="w-full max-w-xs bg-slate-200 dark:bg-white/10 py-4 rounded-xl font-bold text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                    >
                        Voltar ao Início
                    </button>
                </div>
            )}
        </div>
    );
};

export default MotoboyDeliveryConfirm;
