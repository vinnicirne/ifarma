-- ATUALIZAÇÃO DE IMAGENS DO CATÁLOGO
-- Isso popula o banco com links de imagens para testar a funcionalidade de preenchimento automático.
-- Execute no SQL Editor do Supabase.

UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/814740/large-637989357905105268-814740.jpg' WHERE name ILIKE '%Dorflex%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/803876/large-637996160877993750-803876.jpg' WHERE name ILIKE '%Neosaldina%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/803848/large-638006528828987396-803848.jpg' WHERE name ILIKE '%Tylenol%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/795493/large-637827878822986250-795493.jpg' WHERE name ILIKE '%Novalgina%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/813359/large-637937448858888750-813359.jpg' WHERE name ILIKE '%Advil%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/797825/large-637827883582488750-797825.jpg' WHERE name ILIKE '%Buscopan%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/803893/large-637968560882883750-803893.png' WHERE name ILIKE '%Trimedal%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/803659/large-637827891829862500-803659.jpg' WHERE name ILIKE '%Cimegripe%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/795679/large-637827879555611250-795679.jpg' WHERE name ILIKE '%Eno%';
UPDATE product_catalog SET image_url = 'https://cdn.ultrafarma.com.br/static/produtos/814718/large-637985876008638750-814718.jpg' WHERE name ILIKE '%Rivotril%';

-- Exemplo: Busque por "Dorflex" no cadastro para ver a imagem aparecer automaticamente.
