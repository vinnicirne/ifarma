
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MaterialIcon } from '../components/Shared';

export const MotoboyChat = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [order, setOrder] = useState<any>(null);
    const [customer, setCustomer] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    }, []);

    useEffect(() => {
        if (!orderId) return;

        const fetchData = async () => {
            // Fetch Order + Customer Profile + Pharmacy Name
            const { data: orderData } = await supabase
                .from('orders')
                .select('*, profiles:customer_id(*), pharmacies(name)')
                .eq('id', orderId)
                .single();

            if (orderData) {
                setOrder(orderData);
                setCustomer(orderData.profiles);
            }

            // Fetch Messages
            const { data: msgs } = await supabase
                .from('order_messages')
                .select('*')
                .eq('order_id', orderId)
                .order('created_at', { ascending: true });

            if (msgs) setMessages(msgs || []);
        };

        fetchData();

        // Realtime Subscription
        const subscription = supabase
            .channel(`chat_${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'order_messages',
                filter: `order_id=eq.${orderId}`
            }, (payload) => {
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

    const handleSendLocation = async () => {
        setShowAttachments(false);
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const pos = await Geolocation.getCurrentPosition();

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const locationContent = `📍 Localização do Motoboy`;
            const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;

            const { error } = await supabase
                .from('order_messages')
                .insert({
                    order_id: orderId,
                    sender_id: session.user.id,
                    content: locationContent,
                    sender_role: 'motoboy',
                    message_type: 'location',
                    media_url: locationUrl
                });

            if (error) throw error;
        } catch (err) {
            console.error("Error sharing location:", err);
            alert("Não foi possível obter sua localização. Verifique as permissões.");
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
                sender_role: 'motoboy'
            });

        if (error) console.error("Error sending message:", error);
    };

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-white dark:bg-slate-900 font-display transition-colors">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <MaterialIcon name="arrow_back" className="text-slate-700 dark:text-white" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                            {customer?.full_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                            <h2 className="text-slate-900 dark:text-white font-bold leading-tight">
                                {customer?.full_name || 'Cliente'}
                            </h2>
                            <p className="text-slate-500 text-xs font-medium">Chat do Pedido #{orderId?.substring(0, 4)}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-full mb-3">
                            <MaterialIcon name="chat" className="text-4xl text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">Nenhuma mensagem ainda.</p>
                        <p className="text-xs text-slate-400 max-w-[200px]">Combine os detalhes da entrega com o cliente.</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    // Logic: Explicit Role Check
                    let senderLabel = "";
                    let isMeSender = false;
                    let labelColor = "text-slate-500";
                    const isMe = msg.sender_id === session?.user?.id;

                    if (msg.sender_role) {
                        if (msg.sender_role === 'motoboy') {
                            senderLabel = "Eu (Motoboy)";
                            isMeSender = true;
                        } else if (msg.sender_role === 'customer') {
                            senderLabel = `Cliente - ${customer?.full_name || 'Cliente'}`;
                            labelColor = "text-green-600 dark:text-green-400";
                        } else if (msg.sender_role === 'pharmacy') {
                            senderLabel = `Farmácia - ${order?.pharmacies?.name || 'Farmácia'}`;
                            labelColor = "text-blue-600 dark:text-blue-400";
                        }
                    } else {
                        // Legacy Logic
                        const isCustomer = msg.sender_id === order?.customer_id;

                        if (isMe) {
                            senderLabel = "Eu (Motoboy)";
                            isMeSender = true;
                        } else if (isCustomer) {
                            senderLabel = `Cliente - ${customer?.full_name || 'Cliente'}`;
                            labelColor = "text-green-600 dark:text-green-400";
                        } else {
                            senderLabel = `Farmácia - ${order?.pharmacies?.name || 'Farmácia'}`;
                            labelColor = "text-blue-600 dark:text-blue-400";
                        }
                    }

                    // Alignment: Me (Motoboy) Right, Others Left
                    // Use isMeSender (from role/ID) OR fallback ID check
                    const alignRight = isMeSender || (order?.motoboy_id && msg.sender_id === order.motoboy_id);

                    return (
                        <div key={idx} className={`flex flex-col w-full ${alignRight ? 'items-end' : 'items-start'}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-1 ${isMe ? 'text-slate-500' : labelColor}`}>
                                {senderLabel}
                            </span>
                            <div className={`flex w-full ${alignRight ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed
                                    ${alignRight
                                        ? 'bg-primary text-black rounded-tr-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-tl-sm border border-gray-100 dark:border-slate-700'}
                                `}>
                                    {msg.message_type === 'location' ? (
                                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex flex-col w-[180px] group transition-all overflow-hidden rounded-lg">
                                            <div className="bg-black/5 dark:bg-black/20 p-4 flex flex-col items-center gap-2 group-active:scale-95 transition-transform">
                                                <div className="size-10 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                                                    <MaterialIcon name="location_on" className="text-2xl" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Localização</span>
                                            </div>
                                            <div className="bg-black/10 dark:bg-black/40 py-2 px-3 text-center border-t border-black/5">
                                                <span className="text-[10px] font-bold italic">Ver no Mapa</span>
                                            </div>
                                        </a>
                                    ) : msg.message_type === 'prescription' ? (
                                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex flex-col w-[180px] group transition-all overflow-hidden rounded-lg">
                                            <div className="bg-white/10 dark:bg-white/5 p-4 flex flex-col items-center gap-2 group-active:scale-95 transition-transform">
                                                <div className="size-10 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                                                    <MaterialIcon name="description" className="text-2xl" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Receita</span>
                                            </div>
                                            <div className="bg-black/10 dark:bg-black/40 py-2 px-3 text-center border-t border-white/5">
                                                <span className="text-[10px] font-bold italic">Abrir Arquivo</span>
                                            </div>
                                        </a>
                                    ) : (
                                        <p>{msg.content}</p>
                                    )}
                                    <div className={`text-[10px] mt-1 flex justify-end ${alignRight ? 'text-black/60' : 'text-slate-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Input Area */}
            <footer className="relative p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 pb-8 sm:pb-4 safe-area-inset-bottom">
                {/* Attachment Menu */}
                {showAttachments && (
                    <div className="absolute bottom-[80px] left-4 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-slate-700 p-2 flex flex-col gap-1 min-w-[150px] z-[100] transition-all">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                handleSendLocation();
                            }}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-gray-200"
                        >
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <MaterialIcon name="location_on" className="text-primary text-lg" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Enviar Localização</span>
                        </button>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowAttachments(!showAttachments)}
                        className={`size-11 flex items-center justify-center rounded-full shadow-sm transition-all active:scale-90 ${showAttachments ? 'bg-primary text-black rotate-45' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                        <MaterialIcon name="add" className="font-bold" />
                    </button>
                    <input
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full py-3 px-5 text-sm focus:ring-2 focus:ring-primary/50 dark:text-white placeholder-slate-400 transition-all font-medium"
                        placeholder="Enviar mensagem..."
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onFocus={() => setShowAttachments(false)}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="size-11 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                    >
                        <MaterialIcon name="send" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default MotoboyChat;
