import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import type { BannerAdOptions } from '@capacitor-community/admob';
import { supabase } from './supabase';

let adMobEnabled = false;
let bannerUnitId = ''; // default test id: 'ca-app-pub-3940256099942544/6300978111'

export const initializeAdMob = async () => {
    try {
        // Fetch settings from Supabase
        const { data } = await supabase.from('system_settings').select('*');
        const settings: any = {};
        data?.forEach((s: any) => settings[s.key] = s.value);

        if (settings['admob_enabled'] !== 'true') {
            console.log('🚫 AdMob is disabled in settings.');
            adMobEnabled = false;
            return;
        }

        adMobEnabled = true;
        // android specific unit id
        bannerUnitId = settings['admob_banner_id_android'] || 'ca-app-pub-3940256099942544/6300978111'; // Fallback to test ID

        await AdMob.initialize({
            testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
            tagForChildDirectedTreatment: false,
            tagForUnderAgeOfConsent: false,
        });

        console.log('✅ AdMob Initialized');

    } catch (error) {
        console.error('💥 AdMob Initialization Error:', error);
    }
};

export const showBanner = async () => {
    if (!adMobEnabled) return;

    try {
        const options: BannerAdOptions = {
            adId: bannerUnitId,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: true // npa?
            // isTesting: true means it will use test ads even if ID is real? No, mostly uses test ID.
            // For production, we should handle this carefully.
        };
        await AdMob.showBanner(options);
    } catch (error) {
        console.error('Error showing banner:', error);
    }
};

export const hideBanner = async () => {
    try {
        await AdMob.hideBanner();
    } catch (error) {
        // ignore
    }
};

export const removeBanner = async () => {
    try {
        await AdMob.removeBanner();
    } catch (error) {
        // ignore
    }
};
