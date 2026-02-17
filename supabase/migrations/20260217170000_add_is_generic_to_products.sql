-- Migration: Add is_generic column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_generic BOOLEAN DEFAULT false;

-- Update RLS policies if necessary (usually not needed for direct column access if already enabled)
-- Ensure the gestor can see and update this column (covered by existing "Lojistas podem gerenciar produtos" policy)
