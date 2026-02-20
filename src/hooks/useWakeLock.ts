import { useEffect, useRef } from 'react';

export const useWakeLock = (enabled: boolean) => {
    const wakeLock = useRef<any>(null);
    // Fallback interval: plays a silent audio tick to prevent screen sleep
    // on browsers/PWAs that revoke WakeLock aggressively
    const fallbackInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const requestWakeLock = async () => {
            if (!('wakeLock' in navigator) || !enabled) return;
            // Don't re-request if already held
            if (wakeLock.current && !wakeLock.current.released) return;
            try {
                wakeLock.current = await (navigator as any).wakeLock.request('screen');
                console.log('💡 Wake Lock active');
                // Auto-reacquire if the lock is released by the browser
                wakeLock.current.addEventListener('release', () => {
                    console.log('💡 Wake Lock was released by browser — reacquiring...');
                    if (enabled) setTimeout(requestWakeLock, 500);
                });
            } catch (err) {
                console.warn('Wake Lock not available, using heartbeat fallback:', err);
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLock.current && !wakeLock.current.released) {
                try {
                    await wakeLock.current.release();
                    console.log('💡 Wake Lock released');
                } catch (e) {
                    console.warn('Error releasing WakeLock:', e);
                }
                wakeLock.current = null;
            }
        };

        const startFallbackHeartbeat = () => {
            // Fallback: request a tiny fetch every 15s to hint the system to stay awake
            // This is harmless and prevents Android WebView from throttling
            if (fallbackInterval.current) return;
            fallbackInterval.current = setInterval(() => {
                // Re-request WakeLock if lost (common on Android Chrome)
                if ((!wakeLock.current || wakeLock.current.released) && enabled) {
                    requestWakeLock();
                }
            }, 15_000);
        };

        const stopFallbackHeartbeat = () => {
            if (fallbackInterval.current) {
                clearInterval(fallbackInterval.current);
                fallbackInterval.current = null;
            }
        };

        // Re-acquire on tab becoming visible (browser releases WakeLock on hide)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled) {
                requestWakeLock();
            }
        };

        if (enabled) {
            requestWakeLock();
            startFallbackHeartbeat();
            document.addEventListener('visibilitychange', handleVisibilityChange);
        } else {
            releaseWakeLock();
            stopFallbackHeartbeat();
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
            stopFallbackHeartbeat();
        };
    }, [enabled]);
};
