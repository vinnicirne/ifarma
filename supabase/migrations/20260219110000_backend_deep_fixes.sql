-- ============================================================================
-- BACKEND DEEPER DIVE: ORDERS SCHEMA, NOTIFICATIONS & AUTO-CANCEL
-- ============================================================================

BEGIN;

-- 1. ORDERS TABLE ALIGNMENT (Fix 400 Error on Cancellation)
-- Frontend expects these columns to exist
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id);

-- Fix status constraint to allow 'cancelado' and others
DO $$
DECLARE
    constraint_name RECORD;
BEGIN
    -- Find and drop any check constraint on the status column
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.orders'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || quote_ident(constraint_name.conname);
    END LOOP;
END $$;

-- Add standardized status check (Bilingual support)
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
        'pending', 'confirmed', 'preparing', 'ready', 'assigning', 'transferred_to_motoboy', 'delivering', 'delivered', 'cancelled', 'returned',
        'pendente', 'confirmado', 'preparando', 'pronto', 'atribuindo', 'transferido_para_motoboy', 'em_rota', 'entregue', 'cancelado', 'devolvido',
        'aguardando_motoboy', 'aguardando_retirada', 'retirado'
    ));

-- RLS for Orders (Customer can update their own order to 'cancelado')
DROP POLICY IF EXISTS "Customers can update their own orders" ON public.orders;
CREATE POLICY "Customers can update their own orders"
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

-- 2. NOTIFICATIONS TABLE ALIGNMENT
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Auto-update read_at when is_read is set
CREATE OR REPLACE FUNCTION public.fn_sync_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = true AND OLD.is_read = false THEN
        NEW.read_at = now();
    ELSIF NEW.is_read = false THEN
        NEW.read_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_notification_read_at ON public.notifications;
CREATE TRIGGER tr_sync_notification_read_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_notification_read_at();

-- RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 3. CHAT MESSAGES -> NOTIFICATIONS TRIGGER
CREATE OR REPLACE FUNCTION public.fn_notify_on_chat_message()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id UUID;
    v_order_status TEXT;
    v_sender_name TEXT;
    v_order_pharmacy_id UUID;
    v_customer_id UUID;
BEGIN
    SELECT customer_id, pharmacy_id, status INTO v_customer_id, v_order_pharmacy_id, v_order_status
    FROM public.orders
    WHERE id = NEW.order_id;

    SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

    IF NEW.sender_id = v_customer_id THEN
        SELECT owner_id INTO v_recipient_id FROM public.pharmacies WHERE id = v_order_pharmacy_id;
    ELSE
        v_recipient_id := v_customer_id;
    END IF;

    IF v_recipient_id IS NOT NULL AND v_recipient_id != NEW.sender_id THEN
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (
            v_recipient_id,
            '💬 Nova mensagem no Chat',
            COALESCE(v_sender_name, 'Alguém') || ': ' || LEFT(NEW.content, 40) || CASE WHEN length(NEW.content) > 40 THEN '...' ELSE '' END,
            'order',
            jsonb_build_object('order_id', NEW.order_id, 'type', 'chat')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_order_message_notification ON public.order_messages;
CREATE TRIGGER tr_on_order_message_notification
    AFTER INSERT ON public.order_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_on_chat_message();

-- 4. AUTOMATIC CANCELLATION (5 MINUTES)
CREATE OR REPLACE FUNCTION public.cancel_overdue_orders()
RETURNS VOID AS $$
BEGIN
    UPDATE public.orders
    SET 
        status = 'cancelado',
        cancellation_reason = 'timeout',
        cancelled_at = now()
    WHERE 
        status = 'pendente' 
        AND created_at < (now() - interval '5 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SCHEDULED JOB SETUP
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule('cancel-overdue-orders');
    PERFORM cron.schedule('cancel-overdue-orders', '*/1 * * * *', 'SELECT public.cancel_overdue_orders();');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not available.';
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
