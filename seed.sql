-- 1. Inserir Farmácias
INSERT INTO pharmacies (name, address, latitude, longitude, rating, is_open) VALUES
('Farmácia Central', 'Av. Paulista, 1500, São Paulo - SP', -23.5611, -46.6559, 5.0, true),
('BioSaúde Farma', 'Rua das Flores, 45, Curitiba - PR', -25.4290, -49.2671, 4.5, true),
('Droga Popular', 'Av. Beira Mar, 200, Florianópolis - SC', -27.5945, -48.5477, 4.2, true),
('Droga Raia - Zé Garoto', 'Rua Coronel Serrado, 1000', -22.8258, -43.0514, 4.9, true),
('Pacheco - Centro SG', 'Rua Feliciano Sodré, 500', -22.8275, -43.0545, 4.8, true),
('Drogasil - Alcântara', 'Rua Yolanda Saad Abuzaid, 10', -22.8155, -42.9982, 4.7, true);

-- 2. Inserir Produtos
INSERT INTO products (name, description, category) VALUES
('Amoxicilina 500mg', 'Antibiótico eficaz contra infecções bacterianas.', 'Medicamentos'),
('Daily Multivitamins', 'Suplemento vitamínico completo para o dia a dia.', 'Suplementos'),
('Paracetamol 750mg', 'Analgésico e antitérmico.', 'Dor e Febre');

-- 3. Inserir Ofertas (Preços diferentes para o mesmo produto)
-- Amoxicilina
INSERT INTO pharmacy_products (pharmacy_id, product_id, price, stock_quantity)
SELECT p.id, pr.id, 45.90, 50 FROM pharmacies p, products pr WHERE p.name = 'Droga Raia - Zé Garoto' AND pr.name = 'Amoxicilina 500mg';

INSERT INTO pharmacy_products (pharmacy_id, product_id, price, stock_quantity)
SELECT p.id, pr.id, 42.50, 30 FROM pharmacies p, products pr WHERE p.name = 'Pacheco - Centro SG' AND pr.name = 'Amoxicilina 500mg';

INSERT INTO pharmacy_products (pharmacy_id, product_id, price, stock_quantity)
SELECT p.id, pr.id, 39.90, 100 FROM pharmacies p, products pr WHERE p.name = 'Drogasil - Alcântara' AND pr.name = 'Amoxicilina 500mg';

-- Multivitamins
INSERT INTO pharmacy_products (pharmacy_id, product_id, price, stock_quantity)
SELECT p.id, pr.id, 24.99, 20 FROM pharmacies p, products pr WHERE p.name = 'Droga Raia - Zé Garoto' AND pr.name = 'Daily Multivitamins';

INSERT INTO pharmacy_products (pharmacy_id, product_id, price, stock_quantity)
SELECT p.id, pr.id, 29.90, 15 FROM pharmacies p, products pr WHERE p.name = 'Pacheco - Centro SG' AND pr.name = 'Daily Multivitamins';
