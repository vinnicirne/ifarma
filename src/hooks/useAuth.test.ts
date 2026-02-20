import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase');

const mockUnsubscribe = vi.fn();
const defaultAuthStateChange = () => ({
    data: { subscription: { unsubscribe: mockUnsubscribe } }
});

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(defaultAuthStateChange() as any);
    });

    it('deve iniciar com loading = true', () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);

        const { result } = renderHook(() => useAuth());

        expect(result.current.loading).toBe(true);
    });

    it('deve retornar session null quando não há usuário logado', async () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.session).toBeNull();
        expect(result.current.profile).toBeNull();
    });

    it('deve buscar perfil quando há sessão', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const mockProfile = { id: 'user-123', full_name: 'Test User', role: 'client' };

        vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: { session: { user: mockUser, access_token: 'token-123' } }
        } as any);

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        } as any);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.session?.user.id).toBe('user-123');
        expect(result.current.profile).toEqual(mockProfile);
    });

    it('deve lidar com erro ao buscar perfil sem quebrar', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: { session: { user: mockUser, access_token: 'token-123' } }
        } as any);

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Profile not found', code: '404', details: null, hint: null } })
        } as any);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        // deve ter logado o erro
        expect(consoleErrorSpy).toHaveBeenCalled();
        // profile permanece null após erro
        expect(result.current.profile).toBeNull();

        consoleErrorSpy.mockRestore();
    });

    it('deve limpar subscription ao desmontar', () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);

        const { unmount } = renderHook(() => useAuth());
        unmount();

        expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('deve expor função signOut', async () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);
        vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

        const { result } = renderHook(() => useAuth());

        await result.current.signOut();

        expect(supabase.auth.signOut).toHaveBeenCalled();
    });
});
