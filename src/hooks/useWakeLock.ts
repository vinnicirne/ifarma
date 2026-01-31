import { useEffect, useRef } from 'react';

export const useWakeLock = (enabled: boolean) => {
    const wakeLock = useRef<any>(null);

    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && enabled) {
                try {
                    wakeLock.current = await (navigator as any).wakeLock.request('screen');
                    console.log('💡 Wake Lock active');
                } catch (err) {
                    console.error('Wake Lock error:', err);
                }
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLock.current) {
                try {
                    await wakeLock.current.release();
                    wakeLock.current = null;
                    console.log('💡 Wake Lock released');
                } catch (e) {
                    console.error("Erro ao liberar WakeLock", e);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled) {
                requestWakeLock();
            }
        };

        if (enabled) {
            requestWakeLock();
            document.addEventListener('visibilitychange', handleVisibilityChange);
        } else {
            releaseWakeLock();
        }

        return () => {
            releaseWakeLock();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled]);
};
