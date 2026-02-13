import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const PharmacyChat = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [order, setOrder] = useState<any>(null);
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [motoboyName, setMotoboyName] = useState("");
    const [session, setSession] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

        // Reset unread chat count when opening chat
        if (orderId) {
            window.dispatchEvent(new CustomEvent('chat_opened', { detail: { orderId } }));
        }
    }, [orderId]);

    useEffect(() => {
        if (!orderId) return;

        const fetchData = async () => {
            const { data: orderData } = await supabase
                .from('orders')
                .select('*, pharmacies(*)')
                .eq('id', orderId)
                .single();

            if (orderData) {
                setOrder(orderData);
                setPharmacy(orderData.pharmacies);

                // Fetch Motoboy Name if assigned
                if (orderData.motoboy_id) {
                    const { data: mb } = await supabase.from('profiles').select('full_name').eq('id', orderData.motoboy_id).single();
                    if (mb) setMotoboyName(mb.full_name);
                }
            }

            const { data: msgs } = await supabase
                .from('order_messages')
                .select('*')
                .eq('order_id', orderId)
                .order('created_at', { ascending: true });

            if (msgs) setMessages(msgs || []);
        };

        fetchData();

        const subscription = supabase
            .channel(`chat_${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'order_messages',
                filter: `order_id=eq.${orderId}`
            }, (payload) => {
                // Play sound for ALL incoming messages (not just horn)
                const isFromMe = payload.new.sender_id === session?.user?.id;

                if (!isFromMe) {
                    const hornSound = 'https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3';
                    const msgSound = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';

                    // Use horn sound for horn messages, regular sound for others
                    const soundUrl = payload.new.message_type === 'horn' ? hornSound : msgSound;
                    const audio = new Audio(soundUrl);

                    audio.play().catch(e => {
                        console.warn("Chat audio blocked:", e);
                        window.addEventListener('click', () => audio.play(), { once: true });
                    });

                    // Vibrate if available
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                }

                setMessages(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [orderId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const [showAttachments, setShowAttachments] = useState(false);

    const handleUploadPrescription = async (file: File) => {
        setShowAttachments(false);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${orderId}/${Math.random()}.${fileExt}`;
            const filePath = `chat_attachments/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('prescriptions')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('prescriptions')
                .getPublicUrl(filePath);

            await supabase
                .from('order_messages')
                .insert({
                    order_id: orderId,
                    sender_id: session.user.id,
                    content: '📄 Receita Médica enviada',
                    sender_role: 'customer',
                    message_type: 'prescription',
                    media_url: publicUrl
                });

        } catch (err: any) {
            console.error("Error uploading prescription:", err);
            alert("Erro ao enviar receita: " + err.message);
        }
    };

    const handleSendOrderAddress = async () => {
        setShowAttachments(false);
        if (!order?.address) return;

        try {
            await supabase
                .from('order_messages')
                .insert({
                    order_id: orderId,
                    sender_id: session.user.id,
                    content: `🏠 Endereço de Entrega: ${order.address}`,
                    sender_role: 'customer'
                });
        } catch (err) {
            console.error("Error sending address:", err);
        }
    };

    const handleSendLocation = async () => {
        setShowAttachments(false);
        try {
            console.log("📍 Solicitando localização...");
            const { Geolocation } = await import('@capacitor/geolocation');

            // Tentar obter posição com timeout curto
            const pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }).catch(async (err) => {
                console.warn("⚠️ Falha no GPS preciso, tentando modo básico...", err);
                return await Geolocation.getCurrentPosition({
                    enableHighAccuracy: false,
                    timeout: 10000
                });
            });

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const locationContent = `📍 Localização em Tempo Real`;
            const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;

            const { error } = await supabase
                .from('order_messages')
                .insert({
                    order_id: orderId,
                    sender_id: session.user.id,
                    content: locationContent,
                    sender_role: 'customer',
                    message_type: 'location',
                    media_url: locationUrl
                });

            if (error) throw error;
            console.log("✅ Localização enviada via GPS");
        } catch (err: any) {
            console.error("❌ Erro ao compartilhar localização:", err);

            // Fallback: Oferecer enviar o endereço do pedido
            const confirmFallback = window.confirm(
                "Não foi possível obter sua localização GPS.\n\nDeseja enviar seu endereço de entrega cadastrado neste pedido?"
            );

            if (confirmFallback && order?.address) {
                await supabase
                    .from('order_messages')
                    .insert({
                        order_id: orderId,
                        sender_id: session.user.id,
                        content: `🏠 Endereço de Entrega: ${order.address}`,
                        sender_role: 'customer'
                    });
            } else if (!order?.address) {
                alert("Não foi possível obter sua localização. Verifique se o GPS está ativado e as permissões do navegador estão liberadas.");
            }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !session || !orderId) return;

        const content = newMessage.trim();
        setNewMessage("");

        const { error } = await supabase
            .from('order_messages')
            .insert({
                order_id: orderId,
                sender_id: session.user.id,
                content: content,
                sender_role: 'customer'
            });

        if (error) console.error("Error sending message:", error);
    };

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto shadow-2xl border-x border-gray-100 dark:border-gray-800 bg-background-light dark:bg-background-dark font-display">
            {/* TopAppBar */}
            <header className="sticky top-0 z-10 flex flex-col bg-white dark:bg-[#1a2e22] border-b border-gray-100 dark:border-gray-800 pt-10 pb-3 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex items-center justify-center p-2 -ml-2 transition-transform active:scale-90">
                            <MaterialIcon name="arrow_back_ios" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="bg-slate-200 dark:bg-slate-800 rounded-full w-10 h-10 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                                    <MaterialIcon name="store" className="text-primary" />
                                </div>
                                {pharmacy?.is_open && <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-white dark:border-[#1a2e22] rounded-full"></div>}
                            </div>
                            <div>
                                <h2 className="text-[#0d1b13] dark:text-white text-base font-black leading-tight tracking-tighter italic">{pharmacy?.name || 'Farmácia'}</h2>
                                <p className="text-[10px] text-[#4c9a6c] font-black uppercase tracking-widest">{pharmacy?.is_open ? 'Online agora' : 'Offline'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <p className="text-[#4c9a6c] text-[9px] font-black uppercase tracking-widest">Pedido</p>
                        <p className="text-[#0d1b13] dark:text-white text-sm font-black italic">#{orderId?.substring(0, 5)}</p>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background-light dark:bg-background-dark no-scrollbar">
                {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === session?.user?.id;
                    const isMotoboy = msg.sender_id === order?.motoboy_id;

                    let senderLabel = "";
                    if (isMe) {
                        senderLabel = "Eu (Cliente)";
                    } else if (isMotoboy) {
                        senderLabel = `Motoboy - ${motoboyName || 'Entregador'}`;
                    } else {
                        senderLabel = `Farmácia - ${pharmacy?.name || 'Farmácia'}`;
                    }

                    const labelColor = isMotoboy ? 'text-orange-500' : 'text-primary';
                    const alignRight = isMe || (order?.customer_id && msg.sender_id === order.customer_id);

                    return (
                        <div key={idx} className={`flex flex-col gap-1 ${alignRight ? 'items-end' : 'items-start'}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 ${isMe ? 'text-gray-400' : labelColor}`}>
                                {senderLabel}
                            </span>

                            <div className={`flex items-end gap-2 ${alignRight ? 'justify-end' : 'justify-start'}`}>
                                {!alignRight && (
                                    <div className={`rounded-full w-8 h-8 shrink-0 mb-5 flex items-center justify-center ${isMotoboy ? 'bg-orange-100 text-orange-600' : 'bg-primary/20 text-primary'}`}>
                                        <MaterialIcon name={isMotoboy ? 'two_wheeler' : 'store'} className="text-lg" />
                                    </div>
                                )}
                                <div className={`flex flex-col gap-1 ${alignRight ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                    <div className={`text-sm font-bold leading-relaxed rounded-2xl shadow-sm italic overflow-hidden ${alignRight ? 'bg-primary text-[#0d1b13] rounded-br-sm' : 'bg-white dark:bg-[#1a2e22] text-[#0d1b13] dark:text-gray-100 rounded-bl-sm'}`}>
                                        {msg.message_type === 'location' ? (
                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex flex-col w-[200px] group transition-all">
                                                <div className="bg-black/10 dark:bg-black/20 p-4 flex flex-col items-center gap-2 group-active:scale-95 transition-transform">
                                                    <div className="size-12 rounded-full bg-white/30 dark:bg-white/10 flex items-center justify-center shadow-inner">
                                                        <MaterialIcon name="location_on" className="text-3xl" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Localização</span>
                                                </div>
                                                <div className="bg-black/5 dark:bg-black/40 py-2 px-4 text-center border-t border-black/5">
                                                    <span className="text-[11px] font-black italic">Abrir no Google Maps</span>
                                                </div>
                                            </a>
                                        ) : msg.message_type === 'prescription' ? (
                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex flex-col w-[200px] group transition-all">
                                                <div className="bg-white/10 dark:bg-white/5 p-4 flex flex-col items-center gap-2 group-active:scale-95 transition-transform">
                                                    <div className="size-12 rounded-full bg-white/30 dark:bg-white/10 flex items-center justify-center shadow-inner">
                                                        <MaterialIcon name="description" className="text-3xl" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Receita Médica</span>
                                                </div>
                                                <div className="bg-black/10 dark:bg-black/40 py-2 px-4 text-center border-t border-white/10">
                                                    <span className="text-[11px] font-black italic">Visualizar Receita</span>
                                                </div>
                                            </a>
                                        ) : msg.message_type === 'horn' ? (
                                            <div className="flex flex-col items-center gap-3 p-6 bg-orange-500 text-black w-[240px] animate-pulse rounded-2xl shadow-xl border-4 border-white dark:border-slate-800">
                                                <div className="size-16 rounded-full bg-black/10 flex items-center justify-center">
                                                    <MaterialIcon name="volume_up" className="text-4xl" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Aviso Sonoro</p>
                                                    <p className="text-lg font-black italic tracking-tighter leading-tight">{msg.content}</p>
                                                </div>
                                                <button
                                                    onClick={() => new Audio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3').play()}
                                                    className="w-full bg-black text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95"
                                                >
                                                    Tocar Novamente 🔊
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-2">{msg.content}</div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        {alignRight && <MaterialIcon name="done_all" className="text-sm text-primary" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Input Area */}
            <footer className="relative bg-white dark:bg-[#1a2e22] p-4 pb-10 border-t border-gray-100 dark:border-gray-800">
                {showAttachments && (
                    <div className="absolute bottom-[80px] left-4 bg-white dark:bg-[#1a2e22] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-800 p-2 flex flex-col gap-1 min-w-[180px] z-[100]">
                        <button onClick={handleSendLocation} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-700 dark:text-gray-200">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center"><MaterialIcon name="location_on" className="text-primary text-lg" /></div>
                            <span className="text-xs font-black uppercase tracking-widest">Localização GPS</span>
                        </button>
                        <button onClick={handleSendOrderAddress} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-700 dark:text-gray-200">
                            <div className="size-8 rounded-full bg-orange-100 flex items-center justify-center"><MaterialIcon name="home" className="text-orange-600 text-lg" /></div>
                            <span className="text-xs font-black uppercase tracking-widest">Enviar Endereço</span>
                        </button>
                        <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-700 dark:text-gray-200 cursor-pointer">
                            <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center"><MaterialIcon name="description" className="text-blue-600 text-lg" /></div>
                            <span className="text-xs font-black uppercase tracking-widest">Enviar Receita</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadPrescription(file); }} />
                        </label>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <button type="button" onClick={() => setShowAttachments(!showAttachments)} className={`flex items-center justify-center w-12 h-12 rounded-full shadow-sm transition-all active:scale-90 ${showAttachments ? 'bg-primary text-[#0d1b13] rotate-45' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                        <MaterialIcon name="add" className="font-bold" />
                    </button>
                    <div className="flex-1">
                        <input className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full py-3.5 px-6 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white placeholder-gray-500 font-bold italic" placeholder="Escreva sua mensagem..." type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onFocus={() => setShowAttachments(false)} />
                    </div>
                    <button type="submit" className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-[#0d1b13] shadow-xl shadow-primary/20 transition-all active:scale-95 hover:rotate-12">
                        <MaterialIcon name="send" />
                    </button>
                </form>
            </footer>
        </div>
    );
};
