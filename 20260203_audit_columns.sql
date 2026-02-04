-- ===============================================================
-- AUDITORIA RIGOROSA E CORREÇÃO DE COLUNAS (IFARMA)
-- ===============================================================

-- 1. TABELA PHARMACIES (Colunas Essenciais)
DO $$ BEGIN
    -- id, name, created_at, status, logo_url, owner_name, owner_phone, address, plan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'status') THEN
        ALTER TABLE pharmacies ADD COLUMN status TEXT DEFAULT 'Pendente';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'owner_name') THEN
        ALTER TABLE pharmacies ADD COLUMN owner_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'owner_phone') THEN
        ALTER TABLE pharmacies ADD COLUMN owner_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'plan') THEN
        ALTER TABLE pharmacies ADD COLUMN plan TEXT DEFAULT 'Gratuito';
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'address') THEN
        ALTER TABLE pharmacies ADD COLUMN address TEXT;
    END IF;
    -- Validar Check Constraint de Status
    -- (Opcional, mas boa prática)
END $$;

-- 2. TABELA PROFILES (Vínculo com Farmácia)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pharmacy_id') THEN
        ALTER TABLE profiles ADD COLUMN pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;
END $$;

-- 3. TABELA ORDERS (Fluxo de Pedidos)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'pharmacy_id') THEN
        ALTER TABLE orders ADD COLUMN pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'motoboy_id') THEN
        ALTER TABLE orders ADD COLUMN motoboy_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_fee') THEN
        ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'address') THEN
        ALTER TABLE orders ADD COLUMN address TEXT; -- Endereço do cliente
    END IF;
    -- Status enum check?
END $$;

-- 4. TABELA PRODUCTS (Catálogo)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'pharmacy_id') THEN
        ALTER TABLE products ADD COLUMN pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- GERAÇÃO DE RELATÓRIO (OUTPUT NOTICE)
DO $$ 
DECLARE 
    missing_cols TEXT := '';
BEGIN
    RAISE NOTICE 'AUDITORIA CONCLUÍDA. Se não houve erros acima, as colunas foram criadas.';
END $$;
