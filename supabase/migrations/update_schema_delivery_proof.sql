-- Add proof_url column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Create storage bucket for delivery proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated uploads to delivery-proofs
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-proofs');

-- Policy to allow public viewing
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'delivery-proofs');
