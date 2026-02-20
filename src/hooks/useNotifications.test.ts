import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotifications } from './useNotifications';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase');
vi.mock('../lib/firebase');

// Capacitor's dynamic imports need mocking at module level
vi.mock('@capacitor/device', () => ({
    Device: {
        getInfo: vi.fn().mockResolvedValue({ platform: 'web' }),
    },
}));

const USER_ID = 'user-notify-123';

const makeNotif = (overrides = {}) => ({
    id: 'notif-1',
    user_id: USER_ID,
    title: 'Novo pedido',
    body: 'Seu pedido foi aceito',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
});

describe('useNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(supabase.channel).mockReturnValue({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            unsubscribe: vi.fn(),
        } as any);
        vi.mocked(supabase.removeChannel).mockReturnValue(undefined as any);
    });

    it('deve retornar estado inicial vazio quando userId é null', () => {
        const { result } = renderHook(() => useNotifications(null));

        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
        expect(result.current.loading).toBe(false);
    });

    it('deve buscar notificações ao receber userId', async () => {
        const notifs = [makeNotif(), makeNotif({ id: 'notif-2', is_read: true })];

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: notifs, error: null }),
        } as any);

        const { result } = renderHook(() => useNotifications(USER_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.notifications).toHaveLength(2);
        expect(result.current.unreadCount).toBe(1); // só notif-1 não lida
    });

    it('deve marcar notificação como lida', async () => {
        const notif = makeNotif({ is_read: false });

        vi.mocked(supabase.from).mockImplementation((table: any) => {
            if (table === 'notifications') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    update: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue({ data: [notif], error: null }),
                } as any;
            }
            return {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            } as any;
        });

        const { result } = renderHook(() => useNotifications(USER_ID));

        await waitFor(() => expect(result.current.notifications).toHaveLength(1));

        await act(async () => {
            await result.current.markAsRead('notif-1');
        });

        expect(result.current.notifications[0].is_read).toBe(true);
        expect(result.current.unreadCount).toBe(0);
    });

    it('deve marcar todas como lidas via markAllAsRead', async () => {
        const unreadNotifs = [makeNotif(), makeNotif({ id: 'notif-2' })];
        const allReadNotifs = unreadNotifs.map(n => ({ ...n, is_read: true }));

        const fromMock = vi.mocked(supabase.from);

        // 1. Initial Fetch
        fromMock.mockImplementationOnce(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: unreadNotifs, error: null }),
        } as any));

        // 2. MarkAllAsRead Update
        fromMock.mockImplementationOnce(() => {
            const finalEq = vi.fn().mockResolvedValue({ error: null });
            const firstEq = vi.fn().mockReturnValue({ eq: finalEq });
            return { update: vi.fn().mockReturnValue({ eq: firstEq }) } as any;
        });

        // 3. Final Fetch (refresh)
        fromMock.mockImplementationOnce(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: allReadNotifs, error: null }),
        } as any));

        const { result } = renderHook(() => useNotifications(USER_ID));

        // Esperar carregar inicial
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.notifications).toHaveLength(2);
        expect(result.current.unreadCount).toBe(2);

        // Executar ação
        await act(async () => {
            await result.current.markAllAsRead();
        });

        // Verificar resultado final (refresh chamou a terceira implementação)
        expect(result.current.unreadCount).toBe(0);
        expect(result.current.notifications[0].is_read).toBe(true);
    });

    it('deve decrementar unreadCount corretamente (não abaixo de 0)', async () => {
        const notif = makeNotif({ is_read: false });

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [notif], error: null }),
        } as any);

        const { result } = renderHook(() => useNotifications(USER_ID));

        await waitFor(() => expect(result.current.unreadCount).toBe(1));

        // Marcar 2x a mesma notificação — unreadCount não deve ir negativo
        await act(async () => {
            await result.current.markAsRead('notif-1');
            await result.current.markAsRead('notif-1');
        });

        expect(result.current.unreadCount).toBeGreaterThanOrEqual(0);
    });
});
