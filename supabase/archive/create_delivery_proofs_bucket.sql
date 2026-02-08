-- Criar bucket de comprovantes de entrega se não existir
INSERT INTO storage.buckets (id, name, public)
SELECT 'delivery-proofs', 'delivery-proofs', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'delivery-proofs'
);

-- Políticas de acesso para o bucket delivery-proofs
-- Permitir leitura pública
CREATE POLICY "Public Access Delivery Proofs" ON storage.objects 
FOR SELECT USING ( bucket_id = 'delivery-proofs' );

-- Permitir upload para usuários autenticados (Motoboys)
CREATE POLICY "Authenticated Upload Delivery Proofs" ON storage.objects 
FOR INSERT WITH CHECK ( bucket_id = 'delivery-proofs' AND auth.role() = 'authenticated' );

-- Permitir update/delete para quem criou? (Opcional)
-- Geralmente prova de entrega não deve ser deletada, mas vamos permitir update do próprio user
CREATE POLICY "User Update Own Proofs" ON storage.objects 
FOR UPDATE USING ( bucket_id = 'delivery-proofs' AND auth.uid() = owner );
