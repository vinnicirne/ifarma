import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import type { BannerAdOptions } from '@capacitor-community/admob';
import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';

let adMobInitialized = false;
let adMobEnabled = false;
let bannerUnitId = '';

/**
 * Centrally initializes AdMob by fetching settings from Supabase.
 * This should be called once, preferably at app start or home feed load.
 */
export const initializeAdMob = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const { data: settingsData } = await supabase.from('system_settings').select('key, value');
        const settings: any = {};
        settingsData?.forEach((s: any) => settings[s.key] = s.value);

        if (settings['admob_enabled'] !== 'true') {
            console.log('🚫 AdMob is disabled in system_settings.');
            adMobEnabled = false;
            return;
        }

        adMobEnabled = true;
        bannerUnitId = settings['admob_banner_id_android'] || 'ca-app-pub-3940256099942544/6300978111';

        if (!adMobInitialized) {
            await AdMob.initialize({
                testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
                tagForChildDirectedTreatment: false,
                tagForUnderAgeOfConsent: false,
            });
            adMobInitialized = true;
            console.log('✅ AdMob SDK Initialized');
        }

    } catch (error) {
        console.error('💥 AdMob Initialization Error:', error);
    }
};

/**
 * Shows the banner at a specific position.
 */
export const showBanner = async (position: 'TOP_CENTER' | 'BOTTOM_CENTER' = 'BOTTOM_CENTER') => {
    if (!Capacitor.isNativePlatform() || !adMobEnabled) return;

    try {
        const options: BannerAdOptions = {
            adId: bannerUnitId,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition[position as keyof typeof BannerAdPosition] || BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: bannerUnitId.includes('3940256099942544') // Auto-detect test IDs
        };
        await AdMob.showBanner(options);
        console.log(`📺 AdMob Banner Shown (${position})`);
    } catch (error) {
        console.error('Error showing AdMob banner:', error);
    }
};

export const hideBanner = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await AdMob.hideBanner();
    } catch (error) {
        // ignore
    }
};

export const removeBanner = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await AdMob.removeBanner();
    } catch (error) {
        // ignore
    }
};
