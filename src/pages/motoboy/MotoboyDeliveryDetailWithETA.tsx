import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDirections } from '../../hooks/useDirections';
import MotoboyDeliveryDetail from '../../pages/MotoboyDeliveryDetail';

export const MotoboyDeliveryDetailWithETA = () => {
    const { id: orderId } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [motoboy, setMotoboy] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrderAndMotoboy = async () => {
            if (!orderId) return;
            setLoading(true);
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderError) {
                console.error("Error fetching order:", orderError);
                setLoading(false);
                return;
            }
            setOrder(orderData);

            if (orderData?.motoboy_id) {
                const { data: motoboyData, error: motoboyError } = await supabase
                    .from('motoboys')
                    .select('latitude, longitude') // Assuming motoboy location is stored here
                    .eq('id', orderData.motoboy_id)
                    .single();

                if (motoboyError) {
                    console.error("Error fetching motoboy location:", motoboyError);
                }
                setMotoboy(motoboyData);
            }
            setLoading(false);
        };
        fetchOrderAndMotoboy();
    }, [orderId]);

    // Calcular ETA usando Google Maps Directions API
    const destinationCoords = order ? {
        lat: parseFloat(order.latitude) || -22.9068,
        lng: parseFloat(order.longitude) || -43.1729
    } : null;

    const motoboyCoords = motoboy ? { lat: motoboy.latitude, lng: motoboy.longitude } : null;

    const { result: etaResult, loading: etaLoading } = useDirections(
        motoboyCoords,
        destinationCoords,
        !!motoboy && !!destinationCoords
    );

    const displayETA = etaLoading ? 'Calculando...' : (etaResult?.duration || '8-12 min');

    if (!order && loading) return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-400">Carregando pedido...</p>
            </div>
        </div>
    );

    // Pass displayETA to the child component if it accepts it, 
    // or context, but since MotoboyDeliveryDetail is likely using useParams too, 
    // it displays the details. This wrapper mainly seems to calculate ETA side-effect 
    // or maybe it was intended to pass props.
    // Looking at the original code: return <MotoboyDeliveryDetail />;
    // It seems it just renders the component. The ETA calculation might have been for a global state 
    // or just unused in the original snippet shown? 
    // Wait, the original code had `displayETA` calculated but NOT PASSED to `<MotoboyDeliveryDetail />`.
    // It seems it might be dead code or incomplete in the original. 
    // However, I will preserve the logic.

    return <MotoboyDeliveryDetail />;
};
