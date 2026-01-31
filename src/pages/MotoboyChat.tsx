
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
            // Fetch Order + Customer Profile
            const { data: orderData } = await supabase
                .from('orders')
                .select('*, profiles:customer_id(*)') // Fetch customer profile
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
                content: content
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
                    // Se o sender_id for o usuário logado, é "Minha Mensagem" (Direita)
                    const isMe = msg.sender_id === session?.user?.id;
                    return (
                        <div key={idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed
                                ${isMe
                                    ? 'bg-primary text-black rounded-tr-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-tl-sm border border-gray-100 dark:border-slate-700'}
                            `}>
                                <p>{msg.content}</p>
                                <div className={`text-[10px] mt-1 flex justify-end ${isMe ? 'text-black/60' : 'text-slate-400'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Input Area */}
            <footer className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 pb-8 sm:pb-4 safe-area-inset-bottom">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full py-3 px-5 text-sm focus:ring-2 focus:ring-primary/50 dark:text-white placeholder-slate-400 transition-all font-medium"
                        placeholder="Enviar mensagem..."
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
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
