-- Atualizar coordenadas para farmácias sem localização (Tribobo/SG approx)
-- Isso corrige o mapa em branco imediatamente

UPDATE pharmacies
SET 
    latitude = -22.8266,
    longitude = -43.0536
WHERE latitude IS NULL OR longitude IS NULL;

-- Verifica se atualizou
SELECT name, latitude, longitude FROM pharmacies;
