-- RESTORE_PHARMACY.sql
-- Corrected: Using 'approved' (lowercase), 'basic' plan (lowercase), and correct columns.

INSERT INTO public.pharmacies (
    id, 
    name, 
    status,        -- Must be lowercase
    plan,          -- Explicitly set 'basic' to avoid default issues
    owner_id, 
    latitude, 
    longitude,
    address,
    zip,           -- Using correct column name
    city,
    state,
    cnpj           -- Adding CNPJ just in case constraints require uniqueness
)
VALUES (
    '140d30de-77ec-47dc-ae90-059ce3a710e7',  -- The SPECIFIC ID needed
    'Farmácia Recuperada',                   -- Temporary name
    'approved',                              -- Correct: lowercase
    'basic',                                 -- Correct: lowercase
    'a87b5d25-faad-4b87-b4bf-af9cb869d43b',  -- Your user ID
    0.0, 0.0,                                -- Placeholder Location
    'Endereço a definir',
    '00000-000',
    'Cidade',
    'UF',
    '00000000000000'                         -- Dummy CNPJ
)
ON CONFLICT (id) DO UPDATE SET 
    status = 'approved',
    plan = 'basic',
    owner_id = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b';

-- Verify it now exists
SELECT id, name, status, plan, owner_id FROM public.pharmacies WHERE id = '140d30de-77ec-47dc-ae90-059ce3a710e7';
