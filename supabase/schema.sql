-- Zyro Mall — Complete Supabase PostgreSQL Schema, RLS Policies, Triggers & Storage Buckets
-- Run this script once in your Supabase Dashboard -> SQL Editor.
-- Safe to re-run (idempotent).

-- ============================================================================
-- 1. EXTENSIONS & HELPER FUNCTIONS
-- ============================================================================

create extension if not exists pgcrypto;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

create table if not exists public.profiles (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  is_blocked boolean not null default false,
  avatar_url text,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  parent_id text references public.categories(id) on delete set null,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  category_id text references public.categories(id) on delete set null,
  city text not null default 'Lahore',
  whatsapp_number text not null default '03296730804',
  tagline text not null default '',
  description text not null default '',
  details text not null default '',
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  slug text not null unique,
  description text not null default '',
  sku text not null unique,
  category_id text references public.categories(id) on delete set null,
  business_id text references public.businesses(id) on delete set null,
  price numeric(10, 2) not null check (price > 0),
  sale_price numeric(10, 2) check (sale_price is null or sale_price > 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  images text[] not null default '{}',
  status text not null default 'draft' check (status in ('active', 'draft', 'out_of_stock')),
  is_deleted boolean not null default false,
  is_featured boolean not null default false,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_is_deleted on public.products(is_deleted);

create table if not exists public.product_variants (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
  variant_name text not null,
  variant_value text not null,
  price_modifier numeric(10, 2) not null default 0,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sku text,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_variants_product_id on public.product_variants(product_id);

create table if not exists public.addresses (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  city text not null,
  area text not null default '',
  postal_code text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_addresses_user_id on public.addresses(user_id);

create table if not exists public.coupons (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  type text not null check (type in ('percentage', 'flat')),
  value numeric(10, 2) not null check (value > 0),
  min_order_amount numeric(10, 2) not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key default gen_random_uuid()::text,
  order_number text not null unique,
  user_id text references public.profiles(id) on delete set null,
  customer_name text,
  customer_email text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('cod', 'jazzcash', 'easypaisa')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'confirmed', 'paid', 'failed')),
  payment_proof_url text,
  subtotal numeric(10, 2) not null,
  shipping_cost numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  coupon_id text references public.coupons(id) on delete set null,
  coupon_code text,
  shipping_address jsonb not null,
  tracking_number text,
  admin_notes text,
  cancel_reason text,
  return_requested boolean not null default false,
  return_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

create table if not exists public.order_items (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  variant_id text,
  product_title text not null,
  product_image text,
  variant_info text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  total_price numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

create table if not exists public.cart_items (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  variant_id text,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, variant_id)
);

create index if not exists idx_cart_items_user_id on public.cart_items(user_id);

create table if not exists public.wishlist_items (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_wishlist_items_user_id on public.wishlist_items(user_id);

create table if not exists public.reviews (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
  product_title text,
  user_id text not null references public.profiles(id) on delete cascade,
  user_name text,
  order_id text references public.orders(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_reviews_product_id on public.reviews(product_id);

create table if not exists public.banners (
  id text primary key default gen_random_uuid()::text,
  title text not null default '',
  subtitle text not null default '',
  image_url text not null,
  link_url text not null default '/products',
  type text not null default 'hero' check (type in ('hero', 'promo')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key default 1,
  store_name text not null default 'Zyro Mall',
  store_logo_url text,
  contact_email text not null default 'support@zyromall.pk',
  contact_phone text not null default '0329-6730804',
  whatsapp_number text not null default '03296730804',
  flat_shipping_cost numeric(10, 2) not null default 200,
  free_shipping_threshold numeric(10, 2) not null default 5000,
  cod_enabled boolean not null default true,
  low_stock_threshold integer not null default 5,
  maintenance_mode boolean not null default false,
  admin_poster_enabled boolean not null default true,
  admin_poster_title text not null default 'Zyro Mall Official Storefront & Campaign Poster',
  admin_poster_subtitle text not null default '',
  admin_poster_image_url text not null default '',
  admin_poster_cta_label text not null default 'Browse Live Storefront',
  admin_poster_cta_url text not null default '/products',
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_usages (
  id text primary key default gen_random_uuid()::text,
  coupon_id text not null references public.coupons(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  order_id text not null references public.orders(id) on delete cascade,
  used_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

-- ============================================================================
-- 3. TRIGGERS (AUTO UPDATED_AT + SUPABASE AUTH PROFILE SYNC)
-- ============================================================================

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
  for each row execute function public.update_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.update_updated_at();

drop trigger if exists trg_addresses_updated_at on public.addresses;
create trigger trg_addresses_updated_at before update on public.addresses
  for each row execute function public.update_updated_at();

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at before update on public.coupons
  for each row execute function public.update_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.update_updated_at();

drop trigger if exists trg_cart_items_updated_at on public.cart_items;
create trigger trg_cart_items_updated_at before update on public.cart_items
  for each row execute function public.update_updated_at();

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at before update on public.reviews
  for each row execute function public.update_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id::text,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'customer')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()::text and role = 'admin' and is_blocked = false
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.reviews enable row level security;
alter table public.banners enable row level security;
alter table public.store_settings enable row level security;
alter table public.coupon_usages enable row level security;

-- Public catalog policies
drop policy if exists "Public read active categories" on public.categories;
create policy "Public read active categories" on public.categories
  for select using (is_active = true or public.is_admin());

drop policy if exists "Admin manage categories" on public.categories;
create policy "Admin manage categories" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read active products" on public.products;
create policy "Public read active products" on public.products
  for select using ((is_deleted = false and status <> 'draft') or public.is_admin());

drop policy if exists "Admin manage products" on public.products;
create policy "Admin manage products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read product variants" on public.product_variants;
create policy "Public read product variants" on public.product_variants
  for select using (true);

drop policy if exists "Admin manage product variants" on public.product_variants;
create policy "Admin manage product variants" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read active banners" on public.banners;
create policy "Public read active banners" on public.banners
  for select using (is_active = true or public.is_admin());

drop policy if exists "Admin manage banners" on public.banners;
create policy "Admin manage banners" on public.banners
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read store settings" on public.store_settings;
create policy "Public read store settings" on public.store_settings
  for select using (true);

drop policy if exists "Admin update store settings" on public.store_settings;
create policy "Admin update store settings" on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read approved reviews" on public.reviews;
create policy "Public read approved reviews" on public.reviews
  for select using (is_approved = true or user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Users insert own reviews" on public.reviews;
create policy "Users insert own reviews" on public.reviews
  for insert with check (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Users update own reviews" on public.reviews;
create policy "Users update own reviews" on public.reviews
  for update using (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Admin delete reviews" on public.reviews;
create policy "Admin delete reviews" on public.reviews
  for delete using (public.is_admin());

-- User-owned policies
drop policy if exists "Users read own profile or admin" on public.profiles;
create policy "Users read own profile or admin" on public.profiles
  for select using (id = auth.uid()::text or public.is_admin());

drop policy if exists "Users update own profile or admin" on public.profiles;
create policy "Users update own profile or admin" on public.profiles
  for update using (id = auth.uid()::text or public.is_admin());

drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses" on public.addresses
  for all using (user_id = auth.uid()::text or public.is_admin())
  with check (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Users manage own cart" on public.cart_items;
create policy "Users manage own cart" on public.cart_items
  for all using (user_id = auth.uid()::text or public.is_admin())
  with check (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Users manage own wishlist" on public.wishlist_items;
create policy "Users manage own wishlist" on public.wishlist_items
  for all using (user_id = auth.uid()::text or public.is_admin())
  with check (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Users read own orders or admin" on public.orders;
create policy "Users read own orders or admin" on public.orders
  for select using (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Users create own orders" on public.orders;
create policy "Users create own orders" on public.orders
  for insert with check (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Admin update orders" on public.orders;
create policy "Admin update orders" on public.orders
  for update using (public.is_admin() or (user_id = auth.uid()::text and status = 'pending'));

drop policy if exists "Users read own order items or admin" on public.order_items;
create policy "Users read own order items or admin" on public.order_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()::text
    )
  );

drop policy if exists "Users insert own order items" on public.order_items;
create policy "Users insert own order items" on public.order_items
  for insert with check (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()::text
    )
  );

drop policy if exists "Authenticated read coupons" on public.coupons;
create policy "Authenticated read coupons" on public.coupons
  for select using (auth.role() = 'authenticated' or public.is_admin());

drop policy if exists "Admin manage coupons" on public.coupons;
create policy "Admin manage coupons" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin read coupon usages" on public.coupon_usages;
create policy "Admin read coupon usages" on public.coupon_usages
  for select using (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Users insert own coupon usages" on public.coupon_usages;
create policy "Users insert own coupon usages" on public.coupon_usages
  for insert with check (user_id = auth.uid()::text or public.is_admin());

alter table public.businesses enable row level security;
drop policy if exists "Public read active businesses" on public.businesses;
create policy "Public read active businesses" on public.businesses
  for select using (is_active = true or public.is_admin());
drop policy if exists "Admin manage businesses" on public.businesses;
create policy "Admin manage businesses" on public.businesses
  for all using (public.is_admin()) with check (public.is_admin());

-- Security-definer checkout helper RPCs for anon-key + RLS safety
create or replace function public.decrement_product_stock(p_product_id text, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set
    stock_quantity = greatest(0, stock_quantity - greatest(0, p_qty)),
    status = case when stock_quantity - greatest(0, p_qty) <= 0 then 'out_of_stock' else status end
  where id = p_product_id;
end;
$$;

create or replace function public.increment_coupon_used_count(p_coupon_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons
  set used_count = used_count + 1
  where id = p_coupon_id;
end;
$$;

-- ============================================================================
-- 5. STORAGE BUCKETS & POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('banners', 'banners', true),
  ('store-assets', 'store-assets', true),
  ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "Public read public storage buckets" on storage.objects;
create policy "Public read public storage buckets" on storage.objects
  for select using (bucket_id in ('product-images', 'banners', 'store-assets'));

drop policy if exists "Authenticated upload payment proofs" on storage.objects;
create policy "Authenticated upload payment proofs" on storage.objects
  for insert with check (bucket_id = 'payment-proofs' and auth.role() = 'authenticated');

drop policy if exists "Admin manage all storage objects" on storage.objects;
create policy "Admin manage all storage objects" on storage.objects
  for all using (public.is_admin()) with check (public.is_admin());
