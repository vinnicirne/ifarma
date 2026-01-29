import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.ifarma.app',
    appName: 'iFarma',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        cleartext: true
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: "#1a2e22",
            showSpinner: false
        }
    }
};

export default config;
