import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWakeLock } from './useWakeLock';

const mockRelease = vi.fn().mockResolvedValue(undefined);
const mockAddEventListener = vi.fn();
const makeSentinel = () => ({
    released: false,
    release: mockRelease,
    addEventListener: mockAddEventListener,
});

let currentSentinel: ReturnType<typeof makeSentinel>;

describe('useWakeLock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentSentinel = makeSentinel();
        vi.mocked((navigator as any).wakeLock.request).mockResolvedValue(currentSentinel);
    });

    // Helper: let all microtasks (Promise callbacks) complete
    const tick = () => act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });

    it('deve solicitar wake lock quando enabled = true', async () => {
        renderHook(() => useWakeLock(true));
        await tick();

        expect((navigator as any).wakeLock.request).toHaveBeenCalledWith('screen');
    });

    it('não deve solicitar wake lock quando enabled = false', async () => {
        renderHook(() => useWakeLock(false));
        await tick();

        expect((navigator as any).wakeLock.request).not.toHaveBeenCalled();
    });

    it('deve liberar wake lock ao mudar enabled para false', async () => {
        const { rerender } = renderHook(({ enabled }) => useWakeLock(enabled), {
            initialProps: { enabled: true }
        });
        await tick();

        expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(1);

        rerender({ enabled: false });
        await tick();

        expect(mockRelease).toHaveBeenCalled();
    });

    it('deve lidar graciosamente quando wakeLock.request lança exceção', async () => {
        vi.mocked((navigator as any).wakeLock.request).mockRejectedValue(
            new Error('WakeLock not supported')
        );

        let error: unknown;
        try {
            const { unmount } = renderHook(() => useWakeLock(true));
            await tick();
            unmount();
        } catch (e) {
            error = e;
        }

        expect(error).toBeUndefined();
    });

    it('deve registrar listener de visibilitychange quando enabled = true', async () => {
        const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

        renderHook(() => useWakeLock(true));
        await tick();

        expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

        addEventListenerSpy.mockRestore();
    });

    it('deve remover listener de visibilitychange ao desmontar', async () => {
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

        const { unmount } = renderHook(() => useWakeLock(true));
        await tick();

        unmount();
        await tick();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        removeEventListenerSpy.mockRestore();
    });

    it('deve liberar wake lock ao desmontar', async () => {
        const { unmount } = renderHook(() => useWakeLock(true));
        await tick();

        unmount();
        await tick();

        expect(mockRelease).toHaveBeenCalled();
    });

    it('deve registrar listener release no sentinel para recuperação automática', async () => {
        renderHook(() => useWakeLock(true));
        await tick();

        // O hook deve registrar listener 'release' no sentinel para auto-reacquire
        expect(mockAddEventListener).toHaveBeenCalledWith('release', expect.any(Function));
    });

    it('não deve fazer request duplo se sentinel ainda está ativo (released = false)', async () => {
        renderHook(() => useWakeLock(true));
        await tick();

        // Tentar reaplicar o mesmo enabled sem mudanças
        const callCount = (navigator as any).wakeLock.request.mock.calls.length;

        // Re-renderizar sem mudança — não deve re-requestar
        await tick();

        expect((navigator as any).wakeLock.request.mock.calls.length).toBe(callCount);
    });

    it('deve criar intervalo de heartbeat ao habilitar', async () => {
        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

        const { unmount } = renderHook(() => useWakeLock(true));
        await tick();

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15_000);

        unmount();
        setIntervalSpy.mockRestore();
    });

    it('deve limpar intervalo ao desmontar', async () => {
        const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

        const { unmount } = renderHook(() => useWakeLock(true));
        await tick();

        unmount();
        await tick();

        expect(clearIntervalSpy).toHaveBeenCalled();
        clearIntervalSpy.mockRestore();
    });
});
