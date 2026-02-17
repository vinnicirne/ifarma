import React from 'react';
import { Link } from 'react-router-dom';
import { MaterialIcon } from '../../MaterialIcon';

export const isPharmacyOpen = (pharmacy: any) => {
    try {
        // If explicit override is set
        if (pharmacy.is_open) return true;

        // Check automatic schedule if enabled
        if (pharmacy.auto_open_status && Array.isArray(pharmacy.opening_hours)) {
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            const todayRule = pharmacy.opening_hours.find((h: any) => h.day === currentDay);

            if (todayRule && !todayRule.closed && typeof todayRule.open === 'string' && typeof todayRule.close === 'string') {
                const [hOpen, mOpen] = todayRule.open.split(':').map(Number);
                const [hClose, mClose] = todayRule.close.split(':').map(Number);

                if (isNaN(hOpen) || isNaN(hClose)) return false;

                const openTimeVal = hOpen * 60 + mOpen;
                const closeTimeVal = hClose * 60 + mClose;

                if (currentTime >= openTimeVal && currentTime < closeTimeVal) {
                    return true;
                }
            }
        }
    } catch (err) {
        console.error('Error calculating open status string:', err);
    }
    return false;
};

interface PharmacyCardProps {
    pharmacy: any;
    className?: string;
}

export const PharmacyCard = ({ pharmacy, className = "" }: PharmacyCardProps) => {
    const isOpen = isPharmacyOpen(pharmacy);
    const name = pharmacy.name || 'Farmácia';
    const rating = pharmacy.rating || '5.0';
    
    // Lógica simplificada - apenas verificar se os valores existem
    const hasDeliveryTime = pharmacy.delivery_time_min && pharmacy.delivery_time_max;
    const etaLabel = hasDeliveryTime 
        ? `${pharmacy.delivery_time_min}-${pharmacy.delivery_time_max} min`
        : null;
        
    const distanceFormatted = typeof pharmacy.distance === 'number' && pharmacy.distance !== Infinity
        ? `${pharmacy.distance.toFixed(1)}km`
        : '';

    return (
        <Link
            to={`/pharmacy/${pharmacy.id}`}
            className={`block group ${className}`}
        >
            <div className="relative">
                {/* Card Body - Estilo original */}
                <div className={`flex flex-col gap-2 p-2.5 w-full h-[180px] rounded-[24px] bg-[#1a2e23] transition-transform active:scale-95 border-b-4 border-yellow-400 shadow-[0_10px_16px_-6px_rgba(250,204,21,0.5)] ${!isOpen ? 'grayscale opacity-60' : ''}`}>

                    {/* Image Container with Fixed Aspect Ratio & Skeleton */}
                    <div className="h-28 w-full rounded-xl bg-black/20 flex items-center justify-center p-2 relative overflow-hidden">
                        {pharmacy.logo_url ? (
                            <img
                                src={pharmacy.logo_url}
                                alt={name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-contain rounded-lg"
                            />
                        ) : (
                            <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-black text-xl italic uppercase rounded-lg">
                                {name.charAt(0)}
                            </div>
                        )}

                        {!isOpen && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                <span className="text-[10px] font-black text-white px-2 py-1 bg-red-500 rounded-full shadow-lg border border-red-400">FECHADA</span>
                            </div>
                        )}
                    </div>

                    {/* Info Container */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-white text-[10px] font-black italic truncate uppercase leading-tight tracking-tight">
                            {name}
                        </p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <MaterialIcon name="star" className="text-[8px] text-yellow-500" />
                                    <span className="text-[9px] font-black text-yellow-500">{rating}</span>
                                </div>
                                {etaLabel && (
                                    <div className="flex items-center gap-1 text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                        <MaterialIcon name="schedule" className="text-[10px]" />
                                        <span>{etaLabel}</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-[7px] text-slate-400 ml-1">
                                {distanceFormatted}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};
