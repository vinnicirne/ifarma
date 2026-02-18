CREATE OR REPLACE FUNCTION public.assign_order_to_motoboy(
  p_order_id uuid,
  p_motoboy_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  UPDATE public.orders
  SET
    motoboy_id = p_motoboy_id,
    status = CASE
      WHEN status IN ('cancelado','entregue') THEN status
      WHEN status IN ('em_rota','retirado') THEN status
      WHEN status IN ('pronto_entrega','aguardando_motoboy','aguardando_retirada') THEN 'aguardando_retirada'
      ELSE status
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id
    AND status NOT IN ('cancelado','entregue')
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_order);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_order_to_motoboy(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_order_to_motoboy(uuid, uuid) TO authenticated;
