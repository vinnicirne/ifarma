-- ============================================
-- AUDIT RESET: ROBUST IFARMA SCHEMA (v3)
-- Adapting User Suggestion & Best Practices
-- This is a COMPLETE Database Reset Script.
-- ============================================

-- 0) EXTENSÕES
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- 0.5) CONFIGURAÇÕES DE SISTEMA (Global)
create table if not exists public.system_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamptz default now()
);

-- =========================
-- 1) TABELAS PRINCIPAIS
-- =========================

-- 1.1 Perfis (Usuários e Staff)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone text,
  cpf text unique,
  avatar_url text,
  
  -- Roles: admin (global), merchant (dono de farmacia), staff (funcionario), motoboy (entregador), operator (suporte), customer (cliente)
  role text not null default 'customer' check (role in ('admin', 'merchant', 'staff', 'motoboy', 'operator', 'customer')),
  
  is_active boolean default true,
  is_online boolean default false,
  
  -- Campos legados de rastreamento (mantidos para compatibilidade, mas preferir tabela motoboy_live_locations)
  last_lat numeric,
  last_lng numeric,
  
  pharmacy_id uuid, -- Link para qual farmácia este usuário pertence (staff/merchant)
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1.2 Farmácias
create table if not exists public.pharmacies (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  cnpj text unique,
  address text,
  
  -- Localização fixa da loja
  latitude numeric not null,
  longitude numeric not null,
  
  phone text,
  establishment_phone text, -- Telefone fixo
  email text,
  city text,
  state text,
  zip_code text,
  neighborhood text,
  street text,
  number text,
  complement text,
  logo_url text,
  banner_url text,
  
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  plan text default 'basic' check (plan in ('basic', 'pro', 'premium', 'enterprise')),
  rating numeric default 5.0,
  is_featured boolean default false,
  
  opening_hours jsonb, -- { "mon": { "open": "08:00", "close": "18:00" }, ... }
  is_open boolean default false,
  auto_open_status boolean default false, -- Se true, segue opening_hours automaticamente
  
  delivery_radius_km numeric default 5.0,
  delivery_fee_fixed numeric(10,2) default 5.00,
  delivery_fee_per_km numeric(10,2) default 0.00,
  min_order_value numeric(10,2) default 0.00,
  free_delivery_above numeric(10,2),
  allows_pickup boolean default true,
  
  zip text, -- Alias para zip_code (frontend usa 'zip')
  
  -- Campos informativos do proprietário (denormalizados)
  owner_name text,
  owner_phone text,
  owner_email text,

  -- Configuração de Entrega Avançada
  delivery_fee_type text default 'fixed', -- fixed, km, hybrid
  delivery_ranges jsonb, -- [{ "max_km": 5, "fee": 10 }, ...]
  delivery_free_min_km numeric(10,2),
  delivery_free_min_value numeric(10,2),
  delivery_max_km numeric default 15.0,
  
  owner_id uuid references public.profiles(id), -- Dono principal
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1.3 Membros da Farmácia (Staff e Motoboys Próprios)
create table if not exists public.pharmacy_members (
  id uuid primary key default extensions.uuid_generate_v4(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  role text not null check (role in ('owner', 'manager', 'staff', 'motoboy')),
  is_active boolean default true,
  
  created_at timestamptz default now(),
  unique(pharmacy_id, user_id)
);

-- 1.4 Categorias de Produtos
create table if not exists public.categories (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null unique,
  slug text unique,
  image_url text,
  is_active boolean default true,
  position integer default 0,
  created_at timestamptz default now()
);

-- 1.5 Produtos
create table if not exists public.products (
  id uuid primary key default extensions.uuid_generate_v4(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  promotional_price numeric(10,2) check (promotional_price >= 0),
  
  stock integer default 0 check (stock >= 0),
  category_id uuid references public.categories(id),
  category text, -- redundancia util para queries rapidas
  
  image_url text,
  sku text,
  ean text,
  
  requires_prescription boolean default false,
  is_active boolean default true,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1.6 Promoções e Campanhas
create table if not exists public.promotions (
  id uuid primary key default extensions.uuid_generate_v4(),
  title text not null,
  description text,
  image_url text,
  type text default 'banner', -- banner, discount, bundle
  
  start_date timestamptz,
  end_date timestamptz,
  
  is_active boolean default true,
  position integer default 0,
  
  action_url text, -- Link deeplink interno
  
  created_at timestamptz default now()
);

-- 1.7 Feed do App (Admin Control)
create table if not exists public.app_feed_sections (
  id uuid primary key default extensions.uuid_generate_v4(),
  title text not null, -- "Ofertas do Dia", "Farmácias Perto"
  type text not null, -- 'banner.top', 'pharmacy_list.featured', 'category_grid'
  position integer default 0,
  is_active boolean default true,
  config jsonb default '{}'::jsonb, -- Configurações extras
  created_at timestamptz default now()
);

-- 1.8 Banners do App
create table if not exists public.app_banners (
  id uuid primary key default extensions.uuid_generate_v4(),
  title text,
  image_url text not null,
  action_url text,
  position text default 'home_top', -- home_top, home_middle, category_header
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- =========================
-- 2) PEDIDOS E LOGÍSTICA
-- =========================

-- 2.1 Pedidos
create table if not exists public.orders (
  id uuid primary key default extensions.uuid_generate_v4(),
  customer_id uuid references public.profiles(id),
  pharmacy_id uuid references public.pharmacies(id),
  
  status text not null default 'pending' 
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'assigning', 'transferred_to_motoboy', 'delivering', 'delivered', 'cancelled', 'returned')),
  
  total_price numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  
  payment_method text, -- pix, credit_card, cash
  payment_status text default 'pending', -- pending, paid, failed
  change_for numeric(10,2), -- Troco para
  
  delivery_address jsonb, -- { street, number, neighborhood, lat, lng ... }
  delivery_lat numeric,
  delivery_lng numeric,
  
  motoboy_id uuid references public.profiles(id), -- Motoboy ATUAL atribuido (atalho)
  
  rating integer check (rating between 1 and 5),
  review_text text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2.2 Itens do Pedido
create table if not exists public.order_items (
  id uuid primary key default extensions.uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  
  quantity integer not null default 1,
  price numeric(10,2) not null, -- Preço unitário no momento da compra
  total numeric(10,2) GENERATED ALWAYS AS (quantity * price) STORED,
  
  notes text
);

-- 2.3 Atribuição de Pedidos (Log de Entregas) - ROBUSTO
create table if not exists public.order_assignments (
  id uuid primary key default extensions.uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies(id),
  motoboy_id uuid not null references public.profiles(id),
  assigned_by uuid references public.profiles(id), -- Quem atribuiu (Admin ou Farmacia)
  
  status text not null default 'assigned' 
    check (status in ('assigned', 'accepted', 'rejected', 'started', 'completed', 'cancelled')),
    
  assigned_at timestamptz default now(),
  response_at timestamptz, -- Quando aceitou/rejeitou
  started_at timestamptz, -- Quando saiu para entrega
  completed_at timestamptz, -- Quando entregou
  
  rejection_reason text,
  notes text
);

-- 2.4 Rastreamento em Tempo Real (Live Tracking V2)
-- Tabela otimizada para updates frequentes, desacoplada de Profiles
create table if not exists public.motoboy_live_locations (
  motoboy_id uuid primary key references public.profiles(id) on delete cascade,
  pharmacy_id uuid references public.pharmacies(id), -- Se for fixo
  
  lat numeric not null,
  lng numeric not null,
  heading numeric default 0,
  speed numeric default 0,
  battery_level integer,
  
  is_online boolean default true,
  last_ping timestamptz default now()
);

-- 2.5 Histórico de Rotas (Auditoria GPS)
create table if not exists public.delivery_tracks (
  id uuid primary key default extensions.uuid_generate_v4(),
  order_id uuid references public.orders(id),
  motoboy_id uuid references public.profiles(id),
  
  lat numeric not null,
  lng numeric not null,
  captured_at timestamptz default now()
);

-- 2.6 Notificações
create table if not exists public.notifications (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text, -- order_update, promo, system
  data jsonb, -- Metadata extra (order_id, link...)
  read_at timestamptz,
  created_at timestamptz default now()
);

-- 2.7 Dispositivos (Push Tokens)
create table if not exists public.device_tokens (
  user_id uuid references public.profiles(id) on delete cascade,
  token text not null,
  platform text check (platform in ('android', 'ios', 'web')),
  last_used_at timestamptz default now(),
  primary key (user_id, token)
);

-- 2.8 Alertas de Sistema (Suporte)
create table if not exists public.system_alerts (
  id uuid primary key default extensions.uuid_generate_v4(),
  message text not null,
  severity text check (severity in ('info', 'warning', 'critical')),
  type text, -- 'pharmacy_offline', 'low_stock'
  region text,
  metadata jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =========================
-- 3) ÍNDICES DE PERFORMANCE
-- =========================
create index if not exists idx_orders_pharmacy on public.orders(pharmacy_id);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_products_pharmacy on public.products(pharmacy_id);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_tracking_ping on public.motoboy_live_locations(last_ping);

-- =========================
-- 4) VIEW PARA ADMIN (RPC Helpers)
-- =========================

-- Helper: Check ADMIN/OPERATOR Role
create or replace function public.is_staff()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and role in ('admin', 'operator')
  );
$$;

-- Helper: Check ADMIN Role
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and role = 'admin'
  );
$$;

-- Helper: Get My Pharmacy ID
create or replace function public.get_my_pharmacy_id()
returns uuid
language sql
security definer
as $$
  select pharmacy_id from public.pharmacy_members 
  where user_id = auth.uid() and is_active = true limit 1;
$$;


-- =========================
-- 5) RLS POLICIES (SEGURANÇA TOTAL)
-- =========================

-- Enable RLS everywhere
alter table public.profiles enable row level security;
alter table public.pharmacies enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_assignments enable row level security;
alter table public.motoboy_live_locations enable row level security;
alter table public.app_feed_sections enable row level security;
alter table public.app_banners enable row level security;
alter table public.categories enable row level security;
alter table public.promotions enable row level security; 
alter table public.notifications enable row level security;
alter table public.system_alerts enable row level security;

-- PROFILES
-- Admin/Operator vê tudo. Usuário vê a si mesmo.
drop policy if exists "Staff view all profiles" on profiles;
create policy "Staff view all profiles" on profiles for select using (public.is_staff());
drop policy if exists "User view own profile" on profiles;
create policy "User view own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "User update own profile" on profiles;
create policy "User update own profile" on profiles for update using (auth.uid() = id);
drop policy if exists "Staff view any profile" on profiles;
create policy "Staff view any profile" on profiles for select using (public.is_staff());
drop policy if exists "Staff update any profile" on profiles;
create policy "Staff update any profile" on profiles for update using (public.is_staff());

-- FUNÇÃO DE SUPORTE: Verifica se é Staff (Admin/Support/Operator)
create or replace function public.is_staff()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'support', 'operator', 'merchant') -- Merchant incluído para simplificar, mas idealmente seria separado
  );
end;
$$ language plpgsql security definer;

-- PHARMACIES
-- Publico vê aprovadas. Staff vê todas. Dono vê a sua.
drop policy if exists "Public view approved pharmacies" on pharmacies;
create policy "Public view approved pharmacies" on pharmacies for select using (status = 'approved');
drop policy if exists "Staff view all pharmacies" on pharmacies;
create policy "Staff view all pharmacies" on pharmacies for select using (public.is_staff());
drop policy if exists "Staff create pharmacies" on pharmacies;
create policy "Staff create pharmacies" on pharmacies for insert with check (public.is_staff());
drop policy if exists "Staff update any pharmacy" on pharmacies;
create policy "Staff update any pharmacy" on pharmacies for update using (public.is_staff());
drop policy if exists "Staff delete pharmacies" on pharmacies;
create policy "Staff delete pharmacies" on pharmacies for delete using (public.is_staff());
drop policy if exists "Owner view own pharmacy" on pharmacies;
create policy "Owner view own pharmacy" on pharmacies for select using (owner_id = auth.uid());
drop policy if exists "Owner update own pharmacy" on pharmacies;
create policy "Owner update own pharmacy" on pharmacies for update using (owner_id = auth.uid());

-- PRODUCTS
-- Publico vê ativos. Staff vê tudo. Dono vê sua loja.
drop policy if exists "Public view active products" on products;
create policy "Public view active products" on products for select using (is_active = true);
drop policy if exists "Staff view all products" on products;
create policy "Staff view all products" on products for select using (public.is_staff());
drop policy if exists "Pharmacy manage own products" on products;
create policy "Pharmacy manage own products" on products for all using (
  pharmacy_id in (select pharmacy_id from pharmacy_members where user_id = auth.uid())
  or 
  public.is_staff()
);

-- ORDERS
-- Cliente vê seus. Farmácia vê seus. Motoboy vê atribuídos. Admin vê tudo.
drop policy if exists "Staff view all orders" on orders;
create policy "Staff view all orders" on orders for select using (public.is_staff());
drop policy if exists "Staff manage orders" on orders;
create policy "Staff manage orders" on orders for all using (public.is_staff());
drop policy if exists "Customer view own orders" on orders;
create policy "Customer view own orders" on orders for select using (customer_id = auth.uid());
drop policy if exists "Customer create orders" on orders;
create policy "Customer create orders" on orders for insert with check (customer_id = auth.uid());
drop policy if exists "Pharmacy view own orders" on orders;
create policy "Pharmacy view own orders" on orders for select using (
  pharmacy_id in (select pharmacy_id from pharmacy_members where user_id = auth.uid())
);
drop policy if exists "Pharmacy manage own orders" on orders;
create policy "Pharmacy manage own orders" on orders for update using (
  pharmacy_id in (select pharmacy_id from pharmacy_members where user_id = auth.uid())
);
drop policy if exists "Motoboy view assigned orders" on orders;
create policy "Motoboy view assigned orders" on orders for select using (
  motoboy_id = auth.uid() 
  or id in (select order_id from order_assignments where motoboy_id = auth.uid())
);

-- ORDER ASSIGNMENTS
-- Staff e Farmácia gerenciam. Motoboy vê seus.
drop policy if exists "Staff manage assignments" on order_assignments;
create policy "Staff manage assignments" on order_assignments for all using (public.is_staff());
drop policy if exists "Pharmacy manage assignments" on order_assignments;
create policy "Pharmacy manage assignments" on order_assignments for all using (
  pharmacy_id in (select pharmacy_id from pharmacy_members where user_id = auth.uid())
);
drop policy if exists "Motoboy view own assignments" on order_assignments;
create policy "Motoboy view own assignments" on order_assignments for select using (motoboy_id = auth.uid());
drop policy if exists "Motoboy update own assignments" on order_assignments;
create policy "Motoboy update own assignments" on order_assignments for update using (motoboy_id = auth.uid());

-- LIVE LOCATIONS
-- Motoboy insert/update seu. Admin/Farmácia visualiza.
drop policy if exists "Motoboy update location" on motoboy_live_locations;
create policy "Motoboy update location" on motoboy_live_locations for all using (motoboy_id = auth.uid());
drop policy if exists "Staff view locations" on motoboy_live_locations;
create policy "Staff view locations" on motoboy_live_locations for select using (public.is_staff());
drop policy if exists "Pharmacy view fleet locations" on motoboy_live_locations;
create policy "Pharmacy view fleet locations" on motoboy_live_locations for select using (
  pharmacy_id in (select pharmacy_id from pharmacy_members where user_id = auth.uid())
);

-- FEED & MARKETING (Categories, Promotions, Banners, Feed Sections)
-- Public read-only. Staff manage.
drop policy if exists "Public read categories" on categories;
create policy "Public read categories" on categories for select using (true);
drop policy if exists "Public read promotions" on promotions;
create policy "Public read promotions" on promotions for select using (is_active = true);
drop policy if exists "Public read banners" on app_banners;
create policy "Public read banners" on app_banners for select using (is_active = true);
drop policy if exists "Public read feed" on app_feed_sections;
create policy "Public read feed" on app_feed_sections for select using (is_active = true);

drop policy if exists "Staff manage categories" on categories;
create policy "Staff manage categories" on categories for all using (public.is_staff());
drop policy if exists "Staff manage promotions" on promotions;
create policy "Staff manage promotions" on promotions for all using (public.is_staff());
drop policy if exists "Staff manage banners" on app_banners;
create policy "Staff manage banners" on app_banners for all using (public.is_staff());
drop policy if exists "Staff manage feed" on app_feed_sections;
create policy "Staff manage feed" on app_feed_sections for all using (public.is_staff());

-- NOTIFICATIONS & ALERTS
drop policy if exists "User view own notifications" on notifications;
create policy "User view own notifications" on notifications for select using (user_id = auth.uid());
drop policy if exists "Staff view system alerts" on system_alerts;
create policy "Staff view system alerts" on system_alerts for select using (public.is_staff());
drop policy if exists "Staff manage system alerts" on system_alerts;
create policy "Staff manage system alerts" on system_alerts for update using (public.is_staff());

-- =========================
-- 6) TRIGGERS AUTOMÁTICOS
-- =========================

-- Trigger para atualizar updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_update_profiles on public.profiles;
create trigger on_update_profiles before update on public.profiles for each row execute procedure public.handle_updated_at();
drop trigger if exists on_update_pharmacies on public.pharmacies;
create trigger on_update_pharmacies before update on public.pharmacies for each row execute procedure public.handle_updated_at();
drop trigger if exists on_update_products on public.products;
create trigger on_update_products before update on public.products for each row execute procedure public.handle_updated_at();
drop trigger if exists on_update_orders on public.orders;
create trigger on_update_orders before update on public.orders for each row execute procedure public.handle_updated_at();

-- Trigger: New User -> Create Profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication errors on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =========================
-- 7) SEED DATA (DADOS INICIAIS)
-- =========================

-- Categorias Padrão
insert into public.categories (name, slug, position) values
('Medicamentos', 'medicamentos', 1),
('Higiene Pessoal', 'higiene', 2),
('Beleza', 'beleza', 3),
('Infantil', 'infantil', 4),
('Suplementos', 'suplementos', 5)
on conflict (name) do nothing;

-- Feed Sections Padrão
insert into public.app_feed_sections (title, type, position) values
('Destaques da Semana', 'banner.top', 1),
('Categorias', 'category_grid', 2),
('Farmácias em Destaque', 'pharmacy_list.featured', 3),
('Ofertas Especiais', 'pharmacy_list.bonus', 4),
('Perto de Você', 'pharmacy_list.nearby', 5)
on conflict do nothing;

-- =========================
-- 8) RPCS ESPECIAIS (ADMIN GOD MODE)
-- =========================

-- Admin: Mapa Geral (God View)
create or replace function public.rpc_admin_map_overview()
returns table (
  pharmacy_id uuid,
  pharmacy_name text,
  motoboy_id uuid,
  motoboy_name text,
  lat numeric,
  lng numeric,
  is_online boolean,
  last_ping timestamptz,
  order_id uuid,
  order_status text
)
language sql
security definer
set search_path = public
as $$
  select
    ph.id,
    ph.name,
    m.motoboy_id,
    pr.full_name as name,
    m.lat,
    m.lng,
    m.is_online,
    m.last_ping,
    oa.order_id,
    oa.status
  from public.motoboy_live_locations m
  left join public.pharmacies ph on ph.id = m.pharmacy_id
  join public.profiles pr on pr.id = m.motoboy_id
  left join public.order_assignments oa
    on oa.motoboy_id = m.motoboy_id
    and oa.status in ('assigned','accepted','started')
  where public.is_staff();
$$;

-- FINALIZAÇÃO
notify pgrst, 'reload schema';
