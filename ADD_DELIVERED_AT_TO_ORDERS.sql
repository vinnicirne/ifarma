ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders (delivered_at);
