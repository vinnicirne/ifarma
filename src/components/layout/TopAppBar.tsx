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
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
            <div className="grid grid-cols-[60px_1fr_104px] items-center p-4 pb-2 w-full">
                {/* Left: Menu Button */}
                <div className="flex items-center justify-start">
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="flex size-10 items-center justify-center rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200 active:scale-95 shadow-sm"
                    >
                        <MaterialIcon name="menu" className="text-2xl" />
                    </button>
                </div>

                {/* Center: Location */}
                <div className="flex flex-col items-center justify-center min-w-0 px-2 overflow-hidden">
                    <div className="flex items-center gap-1 opacity-50">
                        <MaterialIcon name="location_on" className="text-[10px] text-primary" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Entregar em</span>
                    </div>
                    <button className="flex items-center gap-1 active:scale-95 transition-transform max-w-full">
                        <h2 className="text-[#0d161b] dark:text-white text-xs font-bold leading-tight truncate">
                            {address || 'Localização Atual'}
                        </h2>
                        <MaterialIcon name="keyboard_arrow_down" className="text-sm shrink-0" />
                    </button>
                </div>

                {/* Right: Icons */}
                <div className="flex items-center justify-end gap-2">
                    <Link to="/cart" className="relative flex items-center justify-center rounded-xl size-10 bg-slate-100/50 dark:bg-white/5 active:scale-95 transition-transform shadow-sm">
                        <MaterialIcon name="shopping_cart" className="text-[#0d161b] dark:text-white" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-background-dark text-[8px] font-black rounded-full size-4 flex items-center justify-center border-2 border-white dark:border-background-dark">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                    <Link to="/notifications" className="relative flex items-center justify-center rounded-xl size-10 bg-slate-100/50 dark:bg-white/5 active:scale-95 transition-transform shadow-sm">
                        <MaterialIcon name="notifications" className="text-[#0d161b] dark:text-white" />
                        {notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black rounded-full size-4 flex items-center justify-center border-2 border-white dark:border-background-dark">
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
