ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS proof_url text,
ADD COLUMN IF NOT EXISTS receiver_name text,
ADD COLUMN IF NOT EXISTS delivery_lat numeric,
ADD COLUMN IF NOT EXISTS delivery_lng numeric;

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders (delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_motoboy_id ON public.orders (motoboy_id);
