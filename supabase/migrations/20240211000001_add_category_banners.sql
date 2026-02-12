-- Add banner fields to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS banner_price text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS banner_color text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS banner_link text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS banner_description text;
