-- Fix RLS for route_history table
-- 1. Ensure table exists (failsafe)
CREATE TABLE IF NOT EXISTS public.route_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motoboy_id UUID REFERENCES auth.users(id),
    order_id UUID REFERENCES public.orders(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
DROP POLICY IF EXISTS "Motoboys can insert their own route history" ON public.route_history;
CREATE POLICY "Motoboys can insert their own route history" 
ON public.route_history FOR INSERT 
WITH CHECK (auth.uid() = motoboy_id);

DROP POLICY IF EXISTS "Motoboys can view their own route history" ON public.route_history;
CREATE POLICY "Motoboys can view their own route history" 
ON public.route_history FOR SELECT 
USING (auth.uid() = motoboy_id);

-- 4. Grant permissions
GRANT ALL ON public.route_history TO authenticated;
GRANT ALL ON public.route_history TO service_role;

-- Also fix profiles table just in case, as useGeolocation updates it too
DROP POLICY IF EXISTS "Users can update own profile location" ON public.profiles;
CREATE POLICY "Users can update own profile location" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- RLS for route_history fixed successfully.
