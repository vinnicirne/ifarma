import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import type { BannerAdOptions } from '@capacitor-community/admob';
import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';

let adMobInitialized = false;
let adMobEnabled = false;
let bannerUnitId = '';

/** Diagnóstico: retorna o estado atual do AdMob para debug */
export const getAdMobStatus = () => ({
    isNative: Capacitor.isNativePlatform(),
    initialized: adMobInitialized,
    enabled: adMobEnabled,
    bannerUnitId: bannerUnitId || '(não definido)'
});

/**
 * Centrally initializes AdMob by fetching settings from Supabase.
 * Só funciona em APK/iOS - no web (localhost) retorna imediatamente.
 */
export const initializeAdMob = async () => {
    if (!Capacitor.isNativePlatform()) {
        if (import.meta.env.DEV) console.log('📱 AdMob: Ignorado no web (apenas app nativo)');
        return;
    }

    try {
        const { data: settingsData, error } = await supabase.from('system_settings').select('key, value');
        if (error) {
            console.warn('⚠️ AdMob: Erro ao carregar system_settings:', error.message);
            adMobEnabled = false;
            return;
        }

        const settings: Record<string, string> = {};
        settingsData?.forEach((s: { key: string; value: string }) => { settings[s.key] = s.value; });

        if (settings['admob_enabled'] !== 'true') {
            console.log('🚫 AdMob desativado em system_settings (admob_enabled !== "true")');
            adMobEnabled = false;
            return;
        }

        adMobEnabled = true;
        bannerUnitId = settings['admob_banner_id_android'] || 'ca-app-pub-2871403878275209/7289782014'; // ID Produção do Banner

        if (!adMobInitialized) {
            await AdMob.initialize({
                testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
                tagForChildDirectedTreatment: false,
                tagForUnderAgeOfConsent: false,
            });
            adMobInitialized = true;
            console.log('✅ AdMob SDK Inicializado | IDs configurados');

            // Implementação do Anúncio de Abertura (App Open simulação via Interstitial)
            try {
                const appOpenId = settings['admob_app_open_id_android'] || 'ca-app-pub-2871403878275209/1346879135';
                console.log('🔄 Preparando Anúncio de Abertura (App Open/Interstitial)...');
                await AdMob.prepareInterstitial({
                    adId: appOpenId,
                    isTesting: appOpenId.includes('3940256099942544')
                });
                await AdMob.showInterstitial();
                console.log('📺 Anúncio de Abertura exibido com sucesso');
            } catch (err) {
                console.error('❌ Falha ao carregar/exibir Anúncio de Abertura:', err);
            }
        }
    } catch (error) {
        console.error('💥 AdMob Init Error:', error);
        adMobEnabled = false;
    }
};

/**
 * Mostra o banner na posição indicada. Só funciona em app nativo.
 */
export const showBanner = async (position: 'TOP_CENTER' | 'BOTTOM_CENTER' = 'BOTTOM_CENTER') => {
    if (!Capacitor.isNativePlatform()) return;
    if (!adMobEnabled) {
        console.warn('⚠️ AdMob showBanner ignorado: adMobEnabled=false');
        return;
    }
    if (!bannerUnitId) {
        console.warn('⚠️ AdMob showBanner ignorado: bannerUnitId vazio');
        return;
    }

    try {
        const options: BannerAdOptions = {
            adId: bannerUnitId,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition[position as keyof typeof BannerAdPosition] || BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: bannerUnitId.includes('3940256099942544') // IDs de teste do Google
        };
        await AdMob.showBanner(options);
        console.log(`📺 AdMob Banner exibido (${position})`);
    } catch (error) {
        console.error('❌ AdMob showBanner error:', error);
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
