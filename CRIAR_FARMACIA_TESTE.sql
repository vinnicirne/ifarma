-- 🧪 CRIAR FARMÁCIA DE TESTE COMPLETA
-- Execute este script no Supabase SQL Editor

-- 1. CRIAR A FARMÁCIA
INSERT INTO pharmacies (
    name,
    cnpj,
    owner_name,
    owner_email,
    owner_phone,
    phone,
    establishment_phone,
    zip,
    street,
    number,
    neighborhood,
    city,
    state,
    address,
    latitude,
    longitude,
    status,
    plan,
    is_open,
    rating,
    delivery_fee_type,
    delivery_fee_fixed,
    delivery_max_km,
    min_order_value,
    allows_pickup
) VALUES (
    'Farmácia Teste Automatizada',
    '12.345.678/0001-99',
    'Gestor Teste',
    'teste.automatizado@ifarma.com',
    '(11) 98765-4321',
    '(11) 3456-7890',
    '(11) 3456-7890',
    '01310-100',
    'Avenida Paulista',
    '1578',
    'Bela Vista',
    'São Paulo',
    'SP',
    'Avenida Paulista, 1578 - Bela Vista, São Paulo - SP',
    -23.561414,
    -46.656139,
    'approved',
    'basic',
    true,
    5.0,
    'fixed',
    5.00,
    15,
    0,
    true
)
RETURNING id, name, owner_email, status;

-- 2. VERIFICAR A FARMÁCIA CRIADA
SELECT 
    id,
    name,
    owner_email,
    status,
    created_at
FROM pharmacies
WHERE owner_email = 'teste.automatizado@ifarma.com';

-- 3. INSTRUÇÕES PARA CRIAR O USUÁRIO
-- Copie o ID da farmácia acima e use no próximo passo

-- IMPORTANTE: Você precisa criar o usuário merchant via Edge Function
-- porque apenas a Edge Function tem permissão para criar usuários no Auth.

-- Execute este código no CONSOLE DO NAVEGADOR (F12):
/*
const { data: { session } } = await supabase.auth.getSession();

const { data, error } = await supabase.functions.invoke('create-user-admin', {
    body: {
        email: 'teste.automatizado@ifarma.com',
        password: 'Teste123!@#',
        auth_token: session.access_token,
        pharmacy_id: 'COLE_O_ID_DA_FARMACIA_AQUI',
        metadata: {
            full_name: 'Gestor Teste',
            role: 'merchant',
            pharmacy_id: 'COLE_O_ID_DA_FARMACIA_AQUI',
            phone: '(11) 98765-4321'
        }
    }
});

console.log('Resultado:', data);
console.log('Erro:', error);
*/

-- 4. VERIFICAR O PERFIL CRIADO
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.email = 'teste.automatizado@ifarma.com';

-- 5. CREDENCIAIS DE ACESSO
-- Email: teste.automatizado@ifarma.com
-- Senha: Teste123!@#
