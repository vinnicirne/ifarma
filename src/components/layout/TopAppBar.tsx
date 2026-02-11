import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCartCount } from '../../hooks/useCartCount';
import { MaterialIcon } from '../Shared';
import { useNotifications } from '../../hooks/useNotifications';
import { NavigationDrawer } from './NavigationDrawer';

export const TopAppBar = ({ onSearch, userLocation, session }: { onSearch: (query: string) => void, userLocation: { lat: number, lng: number } | null, session?: any }) => {
    const [query, setQuery] = useState('');
    const [address, setAddress] = useState('Localização Atual');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const cartCount = useCartCount(session?.user?.id);
    const { unreadCount: notificationCount } = useNotifications(session?.user?.id);

    useEffect(() => {
        const fetchAddress = async () => {
            if (!userLocation) return;

            try {
                const { data: settings } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'google_maps_api_key')
                    .single();

                if (settings?.value) {
                    const response = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.lat},${userLocation.lng}&key=${settings.value}`
                    );
                    const data = await response.json();
                    if (data.results && data.results[0]) {
                        const fullAddress = data.results[0].formatted_address;
                        const shortAddress = fullAddress.split(',').slice(0, 2).join(',');
                        setAddress(shortAddress);
                    }
                }
            } catch (error) {
                console.error("Erro na geocodificação reversa:", error);
            }
        };
        fetchAddress();
    }, [userLocation]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onSearch(val);
    };

    return (
        <div className="sticky top-0 z-50 bg-[#101a22] border-b border-white/5 shadow-lg pt-[env(safe-area-inset-top,20px)]">
            <div className="flex h-16 items-center px-4 w-full gap-4">
                {/* Left: Menu Button */}
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 transition-all text-white active:scale-90 shadow-md border border-white/10"
                >
                    <MaterialIcon name="menu" className="text-2xl" />
                </button>

                {/* Center: Location */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <MaterialIcon name="location_on" className="text-[10px] text-primary" />
                        <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Entregar em</span>
                    </div>
                    <button className="flex items-center gap-1 active:scale-95 transition-transform max-w-full">
                        <h2 className="text-white text-xs font-black leading-tight truncate italic">
                            {address || 'Localização Atual'}
                        </h2>
                        <MaterialIcon name="keyboard_arrow_down" className="text-sm shrink-0 text-primary" />
                    </button>
                </div>

                {/* Right: Icons */}
                <div className="flex items-center justify-end gap-2.5">
                    <Link to="/cart" className="relative flex items-center justify-center rounded-2xl size-11 bg-white/10 active:scale-90 transition-all shadow-md border border-white/10">
                        <MaterialIcon name="shopping_cart" className="text-white" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-primary text-background-dark text-[10px] font-black rounded-full size-5 flex items-center justify-center border-2 border-[#101a22] shadow-sm">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                    <Link to="/notifications" className="relative flex items-center justify-center rounded-2xl size-11 bg-white/10 active:scale-90 transition-all shadow-md border border-white/10 text-white">
                        <MaterialIcon name="notifications" />
                        {notificationCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full size-4.5 flex items-center justify-center border-2 border-[#101a22] shadow-sm animate-pulse">
                                {notificationCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            <div className="px-4 py-3">
                <label className="flex flex-col min-w-40 h-12 w-full">
                    <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
                        <div className="text-[#4c799a] flex border-none bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-xl">
                            <MaterialIcon name="search" />
                        </div>
                        <input
                            value={query}
                            onChange={handleInputChange}
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-[#0d161b] dark:text-white focus:outline-0 focus:ring-0 border-none bg-slate-100 dark:bg-slate-800 focus:border-none h-full placeholder:text-[#4c799a] px-4 pl-2 text-base font-normal leading-normal"
                            placeholder="Buscar remédios ou farmácias"
                        />
                    </div>
                </label>
            </div>

            <NavigationDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                session={session}
            />
        </div>
    );
};
