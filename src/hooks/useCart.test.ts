import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCart } from './useCart';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase');

describe('useCart', () => {
    const mockSession = {
        data: {
            session: {
                user: { id: 'user-123' },
                access_token: 'token-123'
            }
        }
    };

    const mockProduct = {
        id: 'product-1',
        name: 'Dipirona 500mg',
        price: 10.50,
        pharmacies: {
            id: 'pharmacy-1',
            name: 'Farmácia Teste'
        }
    };

    const mockCartItem = {
        id: 'cart-item-1',
        customer_id: 'user-123',
        product_id: 'product-1',
        pharmacy_id: 'pharmacy-1',
        quantity: 2,
        products: mockProduct
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(supabase.auth.getSession).mockResolvedValue(mockSession as any);
    });

    it('deve iniciar com carrinho vazio', async () => {
        const mockFrom = vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
        }));

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useCart());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.cartItems).toEqual([]);
        expect(result.current.total).toBe(0);
    });

    it('deve buscar itens do carrinho ao montar', async () => {
        const mockFrom = vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [mockCartItem], error: null })
        }));

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useCart());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.cartItems).toHaveLength(1);
        expect(result.current.cartItems[0]).toEqual(mockCartItem);
    });

    it('deve calcular total corretamente', async () => {
        const mockFrom = vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [mockCartItem], error: null })
        }));

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useCart());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // 10.50 * 2 = 21.00
        expect(result.current.total).toBe(21);
    });

    it('deve adicionar item ao carrinho', async () => {
        const mockFrom = vi.fn((table) => {
            if (table === 'cart_items') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({ data: [mockCartItem], error: null }),
                    upsert: vi.fn().mockResolvedValue({ data: mockCartItem, error: null })
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            };
        });

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useCart());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await act(async () => {
            await result.current.addToCart('product-1', 'pharmacy-1', 2);
        });

        await waitFor(() => {
            expect(result.current.cartItems).toHaveLength(1);
            expect(result.current.total).toBe(21);
        });
    });

    it('deve lançar erro ao adicionar sem autenticação', async () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);

        const { result } = renderHook(() => useCart());

        await expect(
            result.current.addToCart('product-1', 'pharmacy-1', 1)
        ).rejects.toThrow('Usuário não autenticado');
    });

    it('deve atualizar quantidade de item', async () => {
        const updatedCart = { ...mockCartItem, quantity: 3 };

        const mockFrom = vi.fn((table) => {
            if (table === 'cart_items') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({ data: [updatedCart], error: null }),
                    update: vi.fn().mockReturnThis()
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            };
        });

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useCart());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await act(async () => {
            await result.current.updateQuantity('cart-item-1', 3);
        });

        await waitFor(() => {
            expect(result.current.cartItems[0]?.quantity).toBe(3);
            expect(result.current.total).toBe(31.5); // 10.50 * 3
        });
    });

    it('deve remover item quando quantidade for 0', async () => {
        const mockFrom = vi.fn((table) => {
            if (table === 'cart_items') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                    delete: vi.fn().mockReturnThis()
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            };
        });

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useCart());

        await act(async () => {
            await result.current.updateQuantity('cart-item-1', 0);
        });

        await waitFor(() => {
            expect(result.current.cartItems).toHaveLength(0);
            expect(result.current.total).toBe(0);
        });
    });

    it('deve remover item do carrinho', async () => {
        const mockFrom = vi.fn((table) => {
            if (table === 'cart_items') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                    delete: vi.fn().mockReturnThis()
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            };
        });

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useCart());

        await act(async () => {
            await result.current.removeItem('cart-item-1');
        });

        await waitFor(() => {
            expect(result.current.cartItems).toHaveLength(0);
            expect(result.current.total).toBe(0);
        });
    });

    it('deve limpar carrinho completo', async () => {
        const mockFrom = vi.fn((table) => {
            if (table === 'cart_items') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                    delete: vi.fn().mockReturnThis()
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            };
        });

        vi.mocked(supabase.from).mockImplementation(mockFrom as any);

        const { result } = renderHook(() => useCart());

        await act(async () => {
            await result.current.clearCart();
        });

        expect(result.current.cartItems).toEqual([]);
        expect(result.current.total).toBe(0);
    });
});
