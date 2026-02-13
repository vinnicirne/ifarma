import React from 'react';
import { Link } from 'react-router-dom';
import { MaterialIcon } from '../../MaterialIcon';

export const isPharmacyOpen = (pharmacy: any) => {
    // If explicit override is set
    if (pharmacy.is_open) return true;

    // Check automatic schedule if enabled
    if (pharmacy.auto_open_status && Array.isArray(pharmacy.opening_hours)) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const todayRule = pharmacy.opening_hours.find((h: any) => h.day === currentDay);

        if (todayRule && !todayRule.closed && todayRule.open && todayRule.close) {
            const [hOpen, mOpen] = todayRule.open.split(':').map(Number);
            const [hClose, mClose] = todayRule.close.split(':').map(Number);
            const openTimeVal = hOpen * 60 + mOpen;
            const closeTimeVal = hClose * 60 + mClose;

            if (currentTime >= openTimeVal && currentTime < closeTimeVal) {
                return true;
            }
        }
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
    const distanceFormatted = typeof pharmacy.distance === 'number' && pharmacy.distance !== Infinity
        ? `${pharmacy.distance.toFixed(1)}km`
        : '';

    return (
        <Link
            to={`/pharmacy/${pharmacy.id}`}
            className={`block group ${className}`}
        >
            <div className="relative">
                {/* Card Body */}
                <div className={`flex flex-col gap-2 p-2.5 w-full rounded-[24px] bg-[#1a2e23] transition-transform active:scale-95 border-b-4 border-yellow-400 shadow-[0_10px_16px_-6px_rgba(250,204,21,0.5)] ${!isOpen ? 'grayscale opacity-60' : ''}`}>

                    {/* Image Container */}
                    <div className="aspect-square rounded-xl bg-black/20 flex items-center justify-center p-2 relative overflow-hidden">
                        {pharmacy.logo_url ? (
                            <img
                                src={pharmacy.logo_url}
                                alt={name}
                                className="w-full h-full object-contain rounded-lg"
                            />
                        ) : (
                            <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-black text-xl italic uppercase">
                                {name.charAt(0)}
                            </div>
                        )}

                        {!isOpen && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-[6px] font-black text-white px-1.5 py-0.5 bg-red-500 rounded-full">FECHADA</span>
                            </div>
                        )}
                    </div>

                    {/* Info Container */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-white text-[10px] font-black italic truncate uppercase leading-tight tracking-tight">
                            {name}
                        </p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <MaterialIcon name="star" className="text-[8px] text-yellow-500" />
                                <span className="text-[9px] font-black text-yellow-500">{rating}</span>
                            </div>
                            <span className="text-[7px] text-slate-500 ml-1">
                                {distanceFormatted}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};
