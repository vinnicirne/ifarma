import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFavorites } from './useFavorites';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase');

const USER_ID = 'user-abc';

const makeChain = (result: any) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue(result),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnValue(result),
    order: vi.fn().mockReturnThis(),
});

describe('useFavorites', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve iniciar com listas vazias quando userId é null', async () => {
        const { result } = renderHook(() => useFavorites(null));

        expect(result.current.favoriteProducts).toEqual([]);
        expect(result.current.favoritePharmacies).toEqual([]);
        expect(result.current.loading).toBe(false);
    });

    it('deve buscar favoritos ao receber userId', async () => {
        vi.mocked(supabase.from).mockImplementation((table: any) => {
            if (table === 'favorite_products') {
                return makeChain({ data: [{ product_id: 'prod-1' }, { product_id: 'prod-2' }], error: null }) as any;
            }
            return makeChain({ data: [{ pharmacy_id: 'pharma-1' }], error: null }) as any;
        });

        const { result } = renderHook(() => useFavorites(USER_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.favoriteProducts).toEqual(['prod-1', 'prod-2']);
        expect(result.current.favoritePharmacies).toEqual(['pharma-1']);
    });

    it('deve adicionar produto aos favoritos', async () => {
        vi.mocked(supabase.from).mockReturnValue(
            makeChain({ data: [], error: null }) as any
        );

        const { result } = renderHook(() => useFavorites(USER_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.toggleProductFavorite('prod-novo');
        });

        expect(result.current.favoriteProducts).toContain('prod-novo');
    });

    it('deve remover produto já favoritado', async () => {
        let callCount = 0;
        vi.mocked(supabase.from).mockImplementation((table: any) => {
            callCount++;
            const empty = { data: [], error: null };
            const withProd = { data: [{ product_id: 'prod-1' }], error: null };

            // Primeiro par de chamadas (Promise.all do fetchFavorites inicial)
            if (callCount <= 2) {
                const result = table === 'favorite_products' ? withProd : empty;
                const p = Promise.resolve(result);
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnValue(p),
                    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(empty) }) }),
                    insert: vi.fn().mockResolvedValue(empty),
                } as any;
            }
            // Cada chamada posterior (dentro de toggleProductFavorite)
            const p = Promise.resolve(empty);
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnValue(p),
                delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(empty) }) }),
                insert: vi.fn().mockResolvedValue(empty),
            } as any;
        });

        const { result } = renderHook(() => useFavorites(USER_ID));

        await waitFor(() => expect(result.current.favoriteProducts).toContain('prod-1'));

        await act(async () => {
            await result.current.toggleProductFavorite('prod-1');
        });

        expect(result.current.favoriteProducts).not.toContain('prod-1');
    });

    it('deve adicionar farmácia aos favoritos', async () => {
        vi.mocked(supabase.from).mockReturnValue(
            makeChain({ data: [], error: null }) as any
        );

        const { result } = renderHook(() => useFavorites(USER_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.togglePharmacyFavorite('pharma-nova');
        });

        expect(result.current.favoritePharmacies).toContain('pharma-nova');
    });

    it('deve remover farmácia já favoritada', async () => {
        let callCount = 0;
        vi.mocked(supabase.from).mockImplementation((table: any) => {
            callCount++;
            const empty = { data: [], error: null };
            const withPharma = { data: [{ pharmacy_id: 'pharma-1' }], error: null };

            if (callCount <= 2) {
                const result = table === 'favorite_pharmacies' ? withPharma : empty;
                const p = Promise.resolve(result);
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnValue(p),
                    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(empty) }) }),
                    insert: vi.fn().mockResolvedValue(empty),
                } as any;
            }
            const p = Promise.resolve(empty);
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnValue(p),
                delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(empty) }) }),
                insert: vi.fn().mockResolvedValue(empty),
            } as any;
        });

        const { result } = renderHook(() => useFavorites(USER_ID));

        await waitFor(() => expect(result.current.favoritePharmacies).toContain('pharma-1'));

        await act(async () => {
            await result.current.togglePharmacyFavorite('pharma-1');
        });

        expect(result.current.favoritePharmacies).not.toContain('pharma-1');
    });

    it('não deve fazer nada se userId for null ao chamar toggle', async () => {
        const { result } = renderHook(() => useFavorites(null));

        await act(async () => {
            await result.current.toggleProductFavorite('prod-1');
        });

        expect(supabase.from).not.toHaveBeenCalled();
        expect(result.current.favoriteProducts).toEqual([]);
    });
});
