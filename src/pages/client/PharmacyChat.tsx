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
    }, []);

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
                        senderLabel = "Eu (Cliente)"; // Or just "Cliente"
                    } else if (isMotoboy) {
                        senderLabel = `Motoboy - ${motoboyName || 'Entregador'}`;
                    } else {
                        senderLabel = `Farmácia - ${pharmacy?.name || 'Farmácia'}`;
                    }

                    const labelColor = isMotoboy ? 'text-orange-500' : 'text-primary';

                    // Alignment Logic
                    // Customer (Me) -> Right
                    // Others -> Left
                    const isCustomerSender = (order?.customer_id && msg.sender_id === order.customer_id);
                    const alignRight = isMe || isCustomerSender;

                    return (
                        <div key={idx} className={`flex flex-col gap-1 ${alignRight ? 'items-end' : 'items-start'}`}>
                            {/* Label */}
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
                                    <div className={`text-sm font-bold leading-relaxed rounded-2xl px-4 py-2 shadow-sm italic ${alignRight ? 'bg-primary text-[#0d1b13] rounded-br-sm' : 'bg-white dark:bg-[#1a2e22] text-[#0d1b13] dark:text-gray-100 rounded-bl-sm'}`}>
                                        {msg.content}
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
            <footer className="bg-white dark:bg-[#1a2e22] p-4 pb-10 border-t border-gray-100 dark:border-gray-800">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <button type="button" className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition-transform active:scale-90">
                        <MaterialIcon name="add" />
                    </button>
                    <div className="flex-1 relative">
                        <input
                            className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full py-3.5 px-6 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white placeholder-gray-500 font-bold italic"
                            placeholder="Escreva sua mensagem..."
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-[#0d1b13] shadow-xl shadow-primary/20 transition-all active:scale-95 hover:rotate-12">
                        <MaterialIcon name="send" />
                    </button>
                </form>
            </footer>
        </div>
    );
};
