import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCart } from './useCart';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase');

// Factory helpers
const makeSession = (userId = 'user-123') => ({
    data: { session: { user: { id: userId }, access_token: 'token-abc' } }
});

const makeProduct = (overrides = {}) => ({
    id: 'product-1',
    name: 'Dipirona 500mg',
    price: 10.50,
    pharmacies: { id: 'pharmacy-1', name: 'Farmácia Teste' },
    ...overrides,
});

const makeCartItem = (overrides = {}) => ({
    id: 'cart-item-1',
    customer_id: 'user-123',
    product_id: 'product-1',
    pharmacy_id: 'pharmacy-1',
    quantity: 2,
    products: makeProduct(),
    ...overrides,
});

// O useCart.fetchCartItems faz: .from().select('*, ...').eq('customer_id', id)
// O resultado de .eq() deve ser uma real Promise<{data, error}>
const makeFromBuilder = (finalResult: any) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue(finalResult),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue(finalResult),
    // Terminal: .eq() returns a real Promise
    eq: vi.fn().mockResolvedValue(finalResult),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(finalResult),
    single: vi.fn().mockResolvedValue(finalResult),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
});


describe('useCart', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(supabase.auth.getSession).mockResolvedValue(makeSession() as any);
        vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        } as any);
        vi.mocked(supabase.channel).mockReturnValue({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            unsubscribe: vi.fn(),
        } as any);
    });

    it('deve iniciar com loading = false e carrinho vazio quando sem dados', async () => {
        vi.mocked(supabase.from).mockReturnValue(
            makeFromBuilder({ data: [], error: null }) as any
        );

        const { result } = renderHook(() => useCart());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.cartItems).toEqual([]);
        expect(result.current.total).toBe(0);
    });

    it('deve buscar e popular itens do carrinho ao montar', async () => {
        const item = makeCartItem();
        vi.mocked(supabase.from).mockReturnValue(
            makeFromBuilder({ data: [item], error: null }) as any
        );

        const { result } = renderHook(() => useCart());

        // Agora o loading inicia em true, então waitFor(false) é seguro
        await waitFor(() => expect(result.current.loading).toBe(false));

        await waitFor(() => {
            expect(result.current.cartItems).toHaveLength(1);
            expect(result.current.cartItems[0].id).toBe('cart-item-1');
        });
    });


    it('deve calcular total corretamente (preço * quantidade)', async () => {
        const item = makeCartItem({ quantity: 2 }); // 10.50 * 2 = 21
        vi.mocked(supabase.from).mockReturnValue(
            makeFromBuilder({ data: [item], error: null }) as any
        );

        const { result } = renderHook(() => useCart());

        await waitFor(() => expect(result.current.loading).toBe(false));
        await waitFor(() => expect(result.current.total).toBeCloseTo(21));
    });


    it('deve calcular total com múltiplos itens', async () => {
        const item1 = makeCartItem({ quantity: 2, products: makeProduct({ price: 10.50 }) }); // 21
        const item2 = makeCartItem({ id: 'cart-item-2', product_id: 'product-2', quantity: 1, products: makeProduct({ price: 5.00 }) }); // 5
        vi.mocked(supabase.from).mockReturnValue(
            makeFromBuilder({ data: [item1, item2], error: null }) as any
        );

        const { result } = renderHook(() => useCart());

        await waitFor(() => expect(result.current.loading).toBe(false));
        await waitFor(() => expect(result.current.total).toBeCloseTo(26));
    });


    it('deve lançar erro ao tentar adicionar sem autenticação', async () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);

        const { result } = renderHook(() => useCart());

        await expect(
            result.current.addToCart('product-1', 'pharmacy-1', 1)
        ).rejects.toThrow('Usuário não autenticado');
    });

    it('deve lançar erro ao tentar adicionar itens de outra farmácia', async () => {
        // addToCart faz: getSession, then 2x supabase.from (verify cart pharmacy, check existing)
        // o primeiro from('cart_items').select().eq().limit() deve retornar pharmacy-1
        const crossPharmacyResult = { data: [{ pharmacy_id: 'pharmacy-1' }], error: null };
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue(crossPharmacyResult),
            order: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any);

        const { result } = renderHook(() => useCart());

        await expect(
            result.current.addToCart('product-2', 'pharmacy-2', 1)
        ).rejects.toThrow('já possui itens de outra farmácia');
    });

    it('deve limpar o carrinho via clearCart', async () => {
        const item = makeCartItem();
        // Primeiro fetch retorna item, após clearCart retorna vazio
        vi.mocked(supabase.from)
            .mockReturnValueOnce(makeFromBuilder({ data: [item], error: null }) as any)
            .mockReturnValue(makeFromBuilder({ data: null, error: null }) as any);

        const { result } = renderHook(() => useCart());

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.clearCart();
        });

        expect(result.current.cartItems).toEqual([]);
        expect(result.current.total).toBe(0);
    });

    it('deve nao fazer fetch quando não há sessão após limpar', async () => {
        vi.mocked(supabase.auth.getSession)
            .mockResolvedValueOnce({ data: { session: null } } as any)
            .mockResolvedValue({ data: { session: null } } as any);

        vi.mocked(supabase.from).mockReturnValue(
            makeFromBuilder({ data: [], error: null }) as any
        );

        const { result } = renderHook(() => useCart());

        await act(async () => {
            await result.current.clearCart();
        });

        expect(result.current.cartItems).toEqual([]);
    });
});
