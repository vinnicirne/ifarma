-- check_home_data.sql
-- Check structure of feed sections configuration
SELECT id, type, config FROM public.app_feed_sections WHERE is_active = true ORDER BY position;

-- Check columns of promotions table (used in Carousel)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'promotions';

-- Check columns of categories table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories';

-- Check for any banners table (to see if there's a confusion)
SELECT tablename FROM pg_tables WHERE tablename LIKE '%banner%';
