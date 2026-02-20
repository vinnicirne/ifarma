-- Add missing routing columns for motoboy dashboard
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS route_polyline text,
ADD COLUMN IF NOT EXISTS route_distance_text text,
ADD COLUMN IF NOT EXISTS route_duration_text text;

COMMENT ON COLUMN public.orders.route_polyline IS 'Encoded polyline of the delivery route from Google Maps';
COMMENT ON COLUMN public.orders.route_distance_text IS 'Cache of the distance text from Google Maps (e.g., "5.2 km")';
COMMENT ON COLUMN public.orders.route_duration_text IS 'Cache of the duration text from Google Maps (e.g., "12 mins")';
