import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../Shared';

interface OrderChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string | null;
    customerName: string;
    motoboyName?: string | null;
}

export const OrderChatModal: React.FC<OrderChatModalProps> = ({ isOpen, onClose, orderId, customerName, motoboyName }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [session, setSession] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [participants, setParticipants] = useState<{ customer?: string, motoboy?: string, pharmacy_owner?: string }>({});
    const [pharmacyName, setPharmacyName] = useState("");

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    }, []);

    useEffect(() => {
        if (!isOpen || !orderId) return;

        const fetchMessages = async () => {
            setLoading(true);

            // Fetch Order Details to know IDs and Pharmacy Name
            const { data: orderData } = await supabase
                .from('orders')
                .select('customer_id, motoboy_id, pharmacy_id, pharmacies!pharmacy_id(owner_id, name)')
                .eq('id', orderId)
                .single();

            if (orderData) {
                // Store IDs in a ref or state to use in render
                // For simplicity, let's attach to a state object
                const pharmacy = Array.isArray(orderData.pharmacies) ? orderData.pharmacies[0] : orderData.pharmacies;
                setParticipants({
                    customer: orderData.customer_id,
                    motoboy: orderData.motoboy_id,
                    pharmacy_owner: pharmacy?.owner_id
                });
                setPharmacyName(pharmacy?.name || "Farmácia");
            }

            const { data, error } = await supabase
                .from('order_messages')
                .select('*')
                .eq('order_id', orderId)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
            setLoading(false);
        };

        fetchMessages();

        // Realtime Subscription
        const channel = supabase
            .channel(`chat_merchant_${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'order_messages',
                filter: `order_id=eq.${orderId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                // Scroll to bottom on new message
                setTimeout(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                }, 100);
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [isOpen, orderId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

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
                message_type: 'text',
                sender_role: 'pharmacy' // Explicitly mark as Pharmacy
            });

        if (error) {
            console.error("Erro ao enviar mensagem:", error);
            alert("Erro ao enviar mensagem. Tente novamente.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl flex flex-col h-[600px] max-h-[90vh] overflow-hidden border border-slate-100 dark:border-white/10">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                            <MaterialIcon name="chat" className="text-xl" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white text-lg leading-tight">Chat do Pedido</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                                #{orderId?.substring(0, 6)} • {customerName}
                                {motoboyName && <span className="text-primary ml-1">• {motoboyName}</span>}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-slate-500"
                    >
                        <MaterialIcon name="close" />
                    </button>
                </div>

                {/* Messages Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black/20"
                >
                    {loading && (
                        <div className="flex justify-center py-4">
                            <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    )}

                    {!loading && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                            <MaterialIcon name="forum" className="text-4xl mb-2" />
                            <p className="text-sm font-bold">Nenhuma mensagem ainda</p>
                            <p className="text-xs">Inicie a conversa com o cliente/entregador</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const isMe = msg.sender_id === session?.user?.id;

                        // Determine Sender Role & Name
                        let senderName = "Desconhecido";
                        let senderRole = "";
                        let roleColor = "text-slate-500";
                        let isPharmacy = false;

                        if (msg.sender_role) {
                            // Check Explicit Role FIRST
                            if (msg.sender_role === 'pharmacy') {
                                senderName = pharmacyName;
                                roleColor = "text-green-600 dark:text-green-400";
                                isPharmacy = true;
                            } else if (msg.sender_role === 'customer') {
                                senderName = `Cliente - ${customerName}`;
                                roleColor = "text-blue-600 dark:text-blue-400";
                            } else if (msg.sender_role === 'motoboy') {
                                senderName = `Motoboy - ${motoboyName || 'Entregador'}`;
                                roleColor = "text-orange-600 dark:text-orange-400";
                            }
                        } else {
                            // Legacy Logic
                            if (isMe) {
                                senderName = pharmacyName;
                                isPharmacy = true;
                            } else if (participants.customer && msg.sender_id === participants.customer) {
                                senderName = `Cliente - ${customerName}`;
                                senderRole = "Cliente";
                                roleColor = "text-blue-600 dark:text-blue-400";
                            } else if (participants.motoboy && msg.sender_id === participants.motoboy) {
                                senderName = `Motoboy - ${motoboyName || 'Entregador'}`;
                                senderRole = "Motoboy";
                                roleColor = "text-orange-600 dark:text-orange-400";
                            } else {
                                senderName = pharmacyName;
                                roleColor = "text-green-600 dark:text-green-400";
                                isPharmacy = true;
                            }
                        }

                        // Alignment Logic (Merchant View)
                        // Pharmacy (Me/Owner) -> Right
                        // Customer/Motoboy -> Left
                        // Alignment Logic (Merchant View)
                        // Pharmacy (Me/Owner) -> Right
                        // Customer/Motoboy -> Left

                        const alignRight = isPharmacy || (participants.pharmacy_owner && msg.sender_id === participants.pharmacy_owner) || isMe;

                        // Colors
                        // If Right (Pharmacy) -> Blue/White
                        // If Left (Customer) -> Gray? Or maintain White with colored label.
                        // User wants "WhatsApp style": Me=Green/Blue(Right), Them=White(Left).

                        return (
                            <div key={idx} className={`flex flex-col w-full ${alignRight ? 'items-end' : 'items-start'}`}>
                                {/* Label for Sender - ALWAYS SHOW */}
                                <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-1 ${roleColor}`}>
                                    {isMe ? `${pharmacyName} (Você)` : senderName}
                                </span>

                                <div className={`flex w-full ${alignRight ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                                        ${alignRight
                                            ? 'bg-blue-600 text-white rounded-tr-sm'
                                            : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-white/5'
                                        }`}
                                    >
                                        <p>{msg.content}</p>
                                        <span className={`text-[10px] mt-1 block text-right font-bold ${alignRight ? 'text-white/70' : 'text-slate-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 bg-slate-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="size-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            <MaterialIcon name="send" />
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};
