INSERT INTO system_settings (key, value, description)
VALUES ('google_maps_api_key', 'AIzaSyCfAA2T48IZY7v0Wbjb_36z4MYyPxZlDXY', 'Chave da API do Google Maps para Geocoding e Maps')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
