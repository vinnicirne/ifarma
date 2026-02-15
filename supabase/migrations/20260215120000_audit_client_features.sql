-- ============================================================================
-- AUDIT FIX: Ensure Client Features (Cart, Chat) have Tables & RLS
-- ============================================================================

begin;

-- 1. CART ITEMS (Client Shopping Cart)
-- Ensure table exists (in case it was manual)
create table if not exists public.cart_items (
  id uuid primary key default extensions.uuid_generate_v4(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  pharmacy_id uuid references public.pharmacies(id), -- Optional denormalization
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(customer_id, product_id)
);

-- Enable RLS
alter table public.cart_items enable row level security;

-- Policies for Cart
drop policy if exists "Users manage own cart" on public.cart_items;
create policy "Users manage own cart"
on public.cart_items
for all
to authenticated
using (customer_id = auth.uid())
with check (customer_id = auth.uid());


-- 2. ORDER MESSAGES (Client <-> Pharmacy Chat)
create table if not exists public.order_messages (
  id uuid primary key default extensions.uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  
  message_type text default 'text', -- text, image, audio, horn
  content text,
  image_url text,
  audio_url text,
  
  created_at timestamptz default now(),
  is_read boolean default false
);

-- Enable RLS
alter table public.order_messages enable row level security;

-- Policies for Messages
drop policy if exists "Users read messages for their orders" on public.order_messages;
create policy "Users read messages for their orders"
on public.order_messages
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
    and (
      o.customer_id = auth.uid() 
      or o.motoboy_id = auth.uid()
      or exists (
        select 1 from public.pharmacy_members pm
        where pm.pharmacy_id = o.pharmacy_id
        and pm.user_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Users send messages for their orders" on public.order_messages;
create policy "Users send messages for their orders"
on public.order_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.orders o
    where o.id = order_id
    and (
      o.customer_id = auth.uid()
      or o.motoboy_id = auth.uid()
      or exists (
        select 1 from public.pharmacy_members pm
        where pm.pharmacy_id = o.pharmacy_id
        and pm.user_id = auth.uid()
      )
    )
  )
);

commit;
