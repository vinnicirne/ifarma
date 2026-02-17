-- check_pharmacy_columns.sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pharmacies';
