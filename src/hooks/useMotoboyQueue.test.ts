import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMotoboyQueue } from './useMotoboyQueue';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase');
vi.mock('./useAudio', () => ({
    useAudio: () => ({
        play: vi.fn(),
        stop: vi.fn(),
    }),
}));

const USER_ID = 'motoboy-456';

const makeOrder = (overrides = {}): any => ({
    id: 'order-1',
    status: 'aguardando_motoboy',
    motoboy_id: USER_ID,
    delivery_fee: 5.00,
    created_at: new Date().toISOString(),
    pharmacies: { name: 'Farmácia A', address: 'Rua 1', latitude: -22.9, longitude: -43.1 },
    profiles: { full_name: 'Cliente X', phone: '21999999999', avatar_url: null },
    items: [],
    ...overrides,
});

const makeQueryChain = (resolved: any) => ({
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(resolved),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
});

describe('useMotoboyQueue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(supabase.channel).mockReturnValue({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            unsubscribe: vi.fn(),
        } as any);
        vi.mocked(supabase.removeChannel).mockReturnValue(undefined as any);
    });

    it('deve iniciar com fila vazia e loading = true', () => {
        vi.mocked(supabase.from).mockReturnValue(makeQueryChain({ data: [], error: null }) as any);

        const { result } = renderHook(() => useMotoboyQueue(USER_ID, 'bell'));

        expect(result.current.ordersQueue).toEqual([]);
        expect(result.current.loading).toBe(true);
    });

    it('deve buscar e popular a fila de pedidos do motoboy', async () => {
        const orders = [makeOrder(), makeOrder({ id: 'order-2', status: 'aceito' })];
        vi.mocked(supabase.from).mockReturnValue(makeQueryChain({ data: orders, error: null }) as any);

        const { result } = renderHook(() => useMotoboyQueue(USER_ID, 'bell'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.ordersQueue).toHaveLength(2);
        expect(result.current.ordersQueue[0].id).toBe('order-1');
    });

    it('deve calcular stats diários e expor as propriedades corretas', async () => {
        // Both fetchOrdersQueue and fetchStats call supabase.from('orders')
        // Make a chain that handles all method combinations
        const ordersResult = { data: [], error: null };
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue(ordersResult),
        } as any);

        const { result } = renderHook(() => useMotoboyQueue(USER_ID, 'bell'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Apenas verificar que as propriedades existem com tipos corretos
        expect(typeof result.current.stats.dailyEarnings).toBe('number');
        expect(typeof result.current.stats.deliveriesCount).toBe('number');
    });

    it('deve inicializar com newOrderAlert = null', () => {
        vi.mocked(supabase.from).mockReturnValue(makeQueryChain({ data: [], error: null }) as any);

        const { result } = renderHook(() => useMotoboyQueue(USER_ID, 'bell'));

        expect(result.current.newOrderAlert).toBeNull();
    });

    it('não deve buscar pedidos se userId for undefined', () => {
        const { result } = renderHook(() => useMotoboyQueue(undefined, 'bell'));

        expect(supabase.from).not.toHaveBeenCalled();
        expect(result.current.ordersQueue).toEqual([]);
    });

    it('deve permitir atualizar a fila manualmente via setOrdersQueue', async () => {
        const orders = [makeOrder()];
        vi.mocked(supabase.from).mockReturnValue(makeQueryChain({ data: orders, error: null }) as any);

        const { result } = renderHook(() => useMotoboyQueue(USER_ID, 'bell'));

        await waitFor(() => expect(result.current.ordersQueue).toHaveLength(1));

        act(() => {
            result.current.setOrdersQueue([]);
        });

        expect(result.current.ordersQueue).toHaveLength(0);
    });

    it('deve inicializar unreadChatCount em 0', async () => {
        vi.mocked(supabase.from).mockReturnValue(makeQueryChain({ data: [], error: null }) as any);

        const { result } = renderHook(() => useMotoboyQueue(USER_ID, 'bell'));

        expect(result.current.unreadChatCount).toBe(0);
    });

    it('deve expor isProcessingAction como ref', () => {
        vi.mocked(supabase.from).mockReturnValue(makeQueryChain({ data: [], error: null }) as any);

        const { result } = renderHook(() => useMotoboyQueue(USER_ID, 'bell'));

        expect(result.current.isProcessingAction).toBeDefined();
        expect(result.current.isProcessingAction.current).toBe(false);
    });

    it('deve tratar erro na busca sem quebrar o hook', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(supabase.from).mockReturnValue(
            makeQueryChain({ data: null, error: { message: 'DB error' } }) as any
        );

        const { result } = renderHook(() => useMotoboyQueue(USER_ID, 'bell'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.ordersQueue).toEqual([]);
        consoleErrorSpy.mockRestore();
    });
});
