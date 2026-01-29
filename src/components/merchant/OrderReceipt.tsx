import React from 'react';

interface OrderReceiptProps {
    order: any;
    pharmacyName?: string;
    pharmacyAddress?: string;
    pharmacyPhone?: string;
}

export const OrderReceipt = React.forwardRef<HTMLDivElement, OrderReceiptProps>(({ order, pharmacyName = "Ifarma", pharmacyAddress, pharmacyPhone }, ref) => {
    if (!order) return null;

    const items = order.order_items || []; // Assuming we might join this, but current order list might not have items joined. We need to ensure items are fetched.
    // NOTE: The current MerchantOrderManagement fetches `*` from orders, but not items. 
    // We will need to fetch items when printing or ensure they are present.
    // For now, I'll design this expecting `order.order_items` or `order.items`.

    return (
        <div ref={ref} className="hidden print:block p-2 text-black font-mono text-[12px] leading-tight max-w-[80mm] mx-auto bg-white">
            {/* Header */}
            <div className="text-center border-b border-black pb-2 mb-2">
                <h1 className="text-xl font-bold uppercase">{pharmacyName}</h1>
                {pharmacyAddress && <p className="text-[10px]">{pharmacyAddress}</p>}
                {pharmacyPhone && <p className="text-[10px]">{pharmacyPhone}</p>}
                <p className="mt-1 text-[10px]">--------------------------------</p>
                <p className="font-bold text-sm">PEDIDO #{order.id.substring(0, 6)}</p>
                <p className="text-[10px]">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
            </div>

            {/* Customer */}
            <div className="mb-2 border-b border-black pb-2">
                <p className="font-bold uppercase">CLIENTE</p>
                <p>{order.profiles?.full_name || 'Cliente App'}</p>
                <p>{order.profiles?.phone || ''}</p>
                {order.address && (
                    <p className="mt-1">
                        {order.address}
                        {order.complement && ` - ${order.complement}`}
                    </p>
                )}
                {/* Type: Delivery vs Pickup */}
                <p className="font-bold mt-1 uppercase">ENTREGA</p>
            </div>

            {/* Items */}
            <div className="mb-2 border-b border-black pb-2">
                <div className="flex justify-between mb-1 font-bold">
                    <span>QTD ITEM</span>
                    <span>VL TOTAL</span>
                </div>
                {items.length > 0 ? (
                    items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between mb-1">
                            <span className="w-[10%]">{item.quantity}x</span>
                            <span className="flex-1 px-1 truncate">{item.products?.name || 'Produto'}</span>
                            <span className="w-[20%] text-right">
                                {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(item.unit_price ? (item.unit_price * item.quantity) : (item.price * item.quantity))}
                            </span>
                        </div>
                    ))
                ) : (
                    <p className="text-center italic text-[10px] mt-2">Detalhes dos itens não carregados para impressão simples.</p>
                )}
            </div>

            {/* Totals */}
            <div className="mb-4">
                <div className="flex justify-between text-[10px]">
                    <span>Subtotal</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                    <span>Taxa de Entrega</span>
                    <span>GRÁTIS</span>
                </div>

                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-black border-dashed">
                    <span>TOTAL</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}</span>
                </div>
                <p className="text-xs mt-1 uppercase">PAGAMENTO: {order.payment_method || 'NÃO INFORMADO'}</p>
                {order.change_for && order.payment_method === 'cash' && (
                    <div className="mt-1 border-t border-black border-dashed pt-1">
                        <p className="text-xs">TROCO PARA: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.change_for)}</p>
                        <p className="text-xs font-bold">DEVOLVER: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.change_for - order.total_price)}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] mt-4 border-t border-black pt-2">
                <p>Obrigado pela preferência!</p>
                <p>Ifarma App</p>
            </div>
        </div>
    );
});
