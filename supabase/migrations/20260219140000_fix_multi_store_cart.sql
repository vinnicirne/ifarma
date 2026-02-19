-- ============================================================================
-- FIX: MULTI-STORE CART LOCKOUT (CLT-02)
-- ============================================================================

BEGIN;

-- 1. DATABASE RESTRAINT: Prevent items from different pharmacies in the same cart
CREATE OR REPLACE FUNCTION public.fn_check_cart_pharmacy_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_pharmacy_id UUID;
BEGIN
    -- Get the pharmacy_id of any existing item in the user's cart
    SELECT pharmacy_id INTO v_existing_pharmacy_id
    FROM public.cart_items
    WHERE customer_id = NEW.customer_id
    LIMIT 1;

    -- If the cart is not empty and the new item belongs to a different pharmacy, BLOCK IT.
    -- This enforces a "One Pharmacy per Cart" business rule.
    IF v_existing_pharmacy_id IS NOT NULL AND v_existing_pharmacy_id != NEW.pharmacy_id THEN
        RAISE EXCEPTION 'Seu carrinho já possui itens de outra farmácia. Finalize ou limpe seu carrinho antes de comprar em outra loja.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_cart_pharmacy_consistency ON public.cart_items;
CREATE TRIGGER tr_check_cart_pharmacy_consistency
    BEFORE INSERT ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_cart_pharmacy_consistency();

COMMIT;

NOTIFY pgrst, 'reload schema';
