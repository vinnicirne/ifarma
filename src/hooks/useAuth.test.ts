import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

// Mock do supabase já está no setup.ts
vi.mock('../lib/supabase');

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve iniciar com loading = true', () => {
        const mockSession = { data: { session: null } };
        vi.mocked(supabase.auth.getSession).mockResolvedValue(mockSession as any);
        vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        } as any);

        const { result } = renderHook(() => useAuth());

        expect(result.current.loading).toBe(true);
    });

    it('deve retornar session null quando não há usuário logado', async () => {
        const mockSession = { data: { session: null } };
        vi.mocked(supabase.auth.getSession).mockResolvedValue(mockSession as any);
        vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        } as any);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.session).toBeNull();
        expect(result.current.profile).toBeNull();
    });

    it('deve buscar perfil quando há sessão', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const mockSession = {
            data: {
                session: {
                    user: mockUser,
                    access_token: 'token-123'
                }
            }
        };

        const mockProfile = {
            id: 'user-123',
            name: 'Test User',
            role: 'client'
        };

        vi.mocked(supabase.auth.getSession).mockResolvedValue(mockSession as any);
        vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        } as any);

        const mockFrom = vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        }));

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.session).toBeTruthy();
        expect(result.current.session.user.id).toBe('user-123');
        expect(result.current.profile).toEqual(mockProfile);
    });

    it('deve tratar erro ao buscar perfil', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const mockSession = {
            data: {
                session: {
                    user: mockUser,
                    access_token: 'token-123'
                }
            }
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        vi.mocked(supabase.auth.getSession).mockResolvedValue(mockSession as any);
        vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        } as any);

        const mockFrom = vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Profile not found' }
            })
        }));

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Erro ao buscar perfil:',
            expect.objectContaining({ message: 'Profile not found' })
        );

        consoleErrorSpy.mockRestore();
    });

    it('deve limpar subscription ao desmontar', () => {
        const unsubscribeMock = vi.fn();
        const mockSession = { data: { session: null } };

        vi.mocked(supabase.auth.getSession).mockResolvedValue(mockSession as any);
        vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
            data: { subscription: { unsubscribe: unsubscribeMock } }
        } as any);

        const { unmount } = renderHook(() => useAuth());

        unmount();

        expect(unsubscribeMock).toHaveBeenCalled();
    });
});
