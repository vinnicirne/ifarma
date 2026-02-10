-- Migration: Advanced Catalog Schema (Taxonomy & Rich Product Data)
-- Adapting to User Specification "COMPILADO GERAL"

-- 1. Update CATEGORIES (Taxonomy)
alter table public.categories 
add column if not exists parent_id uuid references public.categories(id),
add column if not exists description text;

-- 2. Create COLLECTIONS (Intenção de Compra)
create table if not exists public.collections (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  type text check (type in ('symptom', 'audience', 'campaign', 'seasonality', 'other')),
  image_url text,
  is_active boolean default true,
  position integer default 0,
  created_at timestamptz default now()
);

-- Enable RLS for collections
alter table public.collections enable row level security;
create policy "Public read collections" on collections for select using (is_active = true);
create policy "Staff manage collections" on collections for all using (public.is_staff());

-- 3. Link Products to Collections (Many-to-Many)
create table if not exists public.product_collections (
  product_id uuid references public.products(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

-- Enable RLS for product_collections
alter table public.product_collections enable row level security;
create policy "Public read product_collections" on product_collections for select using (true);
create policy "Staff manage product_collections" on product_collections for all using (public.is_staff());
create policy "Pharmacy manage product_collections" on product_collections for all using (
  product_id in (select id from public.products where pharmacy_id in (select pharmacy_id from public.pharmacy_members where user_id = auth.uid()))
);

-- 4. Update PRODUCTS with Rich Data (Global Catalog Attributes)
alter table public.products
add column if not exists brand text,
add column if not exists manufacturer text,
add column if not exists principle_active text[], -- Array of strings
add column if not exists dosage text, -- e.g. "500mg"
add column if not exists quantity_label text, -- e.g. "20 comprimidos"
add column if not exists product_type text check (product_type in ('reference', 'generic', 'similar', 'other')),
add column if not exists control_level text, -- e.g. 'none', 'prescription_only', 'controlled_yellow', 'controlled_blue'
add column if not exists age_restriction text,
add column if not exists usage_instructions text,
add column if not exists warnings text,
add column if not exists tags text[],
add column if not exists synonyms text[];

-- 5. Create BADGES (Selos)
create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  icon_url text,
  color text,
  created_at timestamptz default now()
);

alter table public.badges enable row level security;
create policy "Public read badges" on badges for select using (true);
create policy "Staff manage badges" on badges for all using (public.is_staff());

-- 6. Link Products to Badges
create table if not exists public.product_badges (
  product_id uuid references public.products(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  primary key (product_id, badge_id)
);

alter table public.product_badges enable row level security;
create policy "Public read product_badges" on product_badges for select using (true);
create policy "Staff manage product_badges" on product_badges for all using (public.is_staff());

-- 7. Add Indexes for Performance
create index if not exists idx_categories_parent on public.categories(parent_id);
create index if not exists idx_products_brand on public.products(brand);
create index if not exists idx_product_collections_collection on public.product_collections(collection_id);

-- 8. Seed Initial Collections (Examples)
insert into public.collections (name, slug, type) values
('Gripe e Resfriado', 'gripe-resfriado', 'symptom'),
('Dor e Febre', 'dor-febre', 'symptom'),
('Infantil', 'infantil', 'audience'),
('Imunidade', 'imunidade', 'symptom')
on conflict (slug) do nothing;
