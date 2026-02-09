import React, { useEffect } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } from '@capacitor-community/admob';
import { supabase } from '../lib/supabase';

export const AdMobBanner = () => {
    useEffect(() => {
        const initAndShow = async () => {
            // 1. Check if allowed in Supabase
            const { data } = await supabase.from('system_settings').select('*');
            const settings: any = {};
            data?.forEach((s: any) => settings[s.key] = s.value);

            if (settings['admob_enabled'] !== 'true') return;

            const unitId = settings['admob_banner_id_android'] || 'ca-app-pub-3940256099942544/6300978111'; // Google Test ID

            try {
                await AdMob.initialize();

                // Show Banner
                await AdMob.showBanner({
                    adId: unitId,
                    adSize: BannerAdSize.ADAPTIVE_BANNER,
                    position: BannerAdPosition.BOTTOM_CENTER,
                    margin: 60, // Avoid overlapping bottom nav if present
                    isTesting: true // Always use test mode during dev to avoid ban
                });
            } catch (err) {
                console.error("AdMob Banner Error:", err);
            }
        };

        initAndShow();

        return () => {
            AdMob.removeBanner().catch(() => { });
        };
    }, []);

    return null; // AdMob banner is native overlay, does not take DOM space usually, but we can return a placeholder if using web implementation
};
