-- ============================================================================
-- FIX: Auto Cancellation - Robust approach that works with and without pg_cron
-- The function can be called by the frontend directly via RPC as a reliable fallback.
-- ============================================================================

BEGIN;

-- 1. Create/Replace the auto-cancel function (already exists, but make it return useful data)
CREATE OR REPLACE FUNCTION public.cancel_overdue_orders()
RETURNS TABLE(cancelled_order_id UUID, cancelled_at_time TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    UPDATE public.orders
    SET 
        status = 'cancelado',
        cancellation_reason = 'timeout',
        cancelled_at = now()
    WHERE 
        status = 'pendente' 
        AND created_at < (now() - interval '5 minutes')
    RETURNING id, now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execution to authenticated users (so frontend can call as RPC fallback)
GRANT EXECUTE ON FUNCTION public.cancel_overdue_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_overdue_orders() TO anon;

-- 3. Expose as RPC endpoint
-- The function is already callable via supabase.rpc('cancel_overdue_orders')

-- 4. Try to setup pg_cron (silently fails if not available - that's OK, frontend is the fallback)
DO $$
BEGIN
    PERFORM cron.unschedule('cancel-overdue-orders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    PERFORM cron.schedule('cancel-overdue-orders', '* * * * *', 'SELECT public.cancel_overdue_orders();');
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'pg_cron not available. Frontend countdown will serve as primary cancellation mechanism.';
END $$;

-- 5. Also create a single-order check function callable by the frontend
CREATE OR REPLACE FUNCTION public.check_and_cancel_order(order_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    v_status TEXT;
    v_created_at TIMESTAMPTZ;
BEGIN
    SELECT status, created_at INTO v_status, v_created_at
    FROM public.orders
    WHERE id = order_id_param;

    IF NOT FOUND THEN
        RETURN 'not_found';
    END IF;

    IF v_status != 'pendente' THEN
        RETURN v_status; -- Already in another state, return current state
    END IF;

    IF v_created_at < (now() - interval '5 minutes') THEN
        UPDATE public.orders
        SET 
            status = 'cancelado',
            cancellation_reason = 'timeout',
            cancelled_at = now()
        WHERE id = order_id_param;
        RETURN 'cancelado';
    END IF;

    RETURN 'pendente'; -- Still within 5 min window
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_and_cancel_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_cancel_order(UUID) TO anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
