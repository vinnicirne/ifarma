-- ============================================================================
-- FIX: Chat notifications store truncated message (first 40 chars + "...")
-- Root Cause: fn_notify_on_chat_message uses LEFT(content, 40) which
--             stores a permanently truncated message in the notifications table.
--             The frontend cannot show the full text because it doesn't exist in DB.
-- Solution: Store the FULL message content - the frontend handles display truncation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_notify_on_chat_message()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id UUID;
    v_order_status TEXT;
    v_sender_name TEXT;
    v_order_pharmacy_id UUID;
    v_customer_id UUID;
BEGIN
    SELECT customer_id, pharmacy_id, status
    INTO v_customer_id, v_order_pharmacy_id, v_order_status
    FROM public.orders
    WHERE id = NEW.order_id;

    SELECT full_name INTO v_sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    IF NEW.sender_id = v_customer_id THEN
        SELECT owner_id INTO v_recipient_id
        FROM public.pharmacies
        WHERE id = v_order_pharmacy_id;
    ELSE
        v_recipient_id := v_customer_id;
    END IF;

    IF v_recipient_id IS NOT NULL AND v_recipient_id != NEW.sender_id THEN
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (
            v_recipient_id,
            '💬 Nova mensagem no Chat',
            -- FIX: Store FULL message, not truncated. Frontend handles display.
            COALESCE(v_sender_name, 'Alguém') || ': ' || NEW.content,
            'order',
            jsonb_build_object('order_id', NEW.order_id, 'type', 'chat')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
