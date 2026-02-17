-- check_checkout_delivery.sql
-- 1. Check orders for 'complement'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'complement';

-- 2. Check pharmacies for delivery time columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pharmacies' 
AND column_name LIKE '%time%';
