-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  phone text,
  avatar_url text,
  balance numeric(10, 2) not null default 0.00,
  is_admin boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url, is_admin, balance)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false),
    0.00
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- CATEGORIES
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name_ar text not null,
  name_en text not null,
  slug text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.categories enable row level security;

create policy "Categories are viewable by everyone" on public.categories
  for select using (true);

create policy "Only admin can modify categories" on public.categories
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));


-- PRODUCTS
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  title_ar text not null,
  title_en text not null,
  description_ar text,
  description_en text,
  price numeric(10, 2) not null,
  images text[] default '{}'::text[],
  category_id uuid references public.categories(id) on delete set null,
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;

create policy "Active products are viewable by everyone" on public.products
  for select using (is_active = true or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create policy "Only admin can modify products" on public.products
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- Product merchandising fields
alter table public.products add column if not exists original_price numeric(10, 2);
alter table public.products add column if not exists is_featured boolean not null default false;
alter table public.products add column if not exists unit text;
alter table public.products add column if not exists badge_ar text;
alter table public.products add column if not exists badge_en text;
alter table public.products add column if not exists is_offer boolean not null default false;


-- WISHLISTS
create table public.wishlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, product_id)
);

alter table public.wishlists enable row level security;

create policy "Users can view their own wishlist" on public.wishlists
  for select using (auth.uid() = user_id);

create policy "Users can insert into their own wishlist" on public.wishlists
  for insert with check (auth.uid() = user_id);

create policy "Users can delete from their own wishlist" on public.wishlists
  for delete using (auth.uid() = user_id);


-- DISCOUNT CODES
create table public.discount_codes (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(10, 2) not null,
  min_order numeric(10, 2) not null default 0.00,
  max_uses integer,
  uses_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.discount_codes enable row level security;

create policy "Discount codes are viewable by authenticated users" on public.discount_codes
  for select using (auth.role() = 'authenticated');

create policy "Only admin can modify discount codes" on public.discount_codes
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));


-- SHIPPING ZONES
create table public.shipping_zones (
  id uuid default uuid_generate_v4() primary key,
  name_ar text not null,
  name_en text not null,
  cost numeric(10, 2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.shipping_zones enable row level security;

create policy "Shipping zones are viewable by everyone" on public.shipping_zones
  for select using (true);

create policy "Only admin can modify shipping zones" on public.shipping_zones
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));


-- ORDERS
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled')) default 'pending',
  subtotal numeric(10, 2) not null,
  shipping_cost numeric(10, 2) not null,
  discount numeric(10, 2) not null default 0.00,
  total numeric(10, 2) not null,
  customer_name text not null,
  phone text not null,
  address text not null,
  governorate text not null,
  discount_code text,
  payment_method text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;

create policy "Users can view their own orders" on public.orders
  for select using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create policy "Users can create their own orders" on public.orders
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Only admin can update orders" on public.orders
  for update using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));


-- ORDER ITEMS
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  price numeric(10, 2) not null,
  quantity integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.order_items enable row level security;

create policy "Users can view their own order items" on public.order_items
  for select using (exists (
    select 1 from public.orders
    where orders.id = order_id and (orders.user_id = auth.uid() or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  ));

create policy "Anyone can create order items" on public.order_items
  for insert with check (true);


-- CHAT MESSAGES
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id) on delete cascade,
  session_id text not null, -- for guests
  message text not null,
  is_admin boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;

create policy "Users can see their own chat messages" on public.chat_messages
  for select using (auth.uid() = sender_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create policy "Anyone can insert chat messages" on public.chat_messages
  for insert with check (true);


-- CONTACT MESSAGES
create table public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.contact_messages enable row level security;

create policy "Anyone can submit contact messages" on public.contact_messages
  for insert with check (true);

create policy "Only admin can view contact messages" on public.contact_messages
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));


-- RETURNS
create table public.returns (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  refund_amount numeric(10, 2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.returns enable row level security;

create policy "Users can view and create their own return requests" on public.returns
  using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create policy "Users can insert their own return requests" on public.returns
  for insert with check (auth.uid() = user_id);


-- WALLET TRANSACTIONS
create table public.wallet_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(10, 2) not null, -- positive for credit, negative for debit
  type text not null check (type in ('refund', 'purchase', 'admin_adjustment')),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wallet_transactions enable row level security;

create policy "Users can view their own wallet transactions" on public.wallet_transactions
  for select using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create policy "Only system/admin can create transactions" on public.wallet_transactions
  for insert with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));


-- Trigger to adjust profile balance automatically when wallet transaction is inserted
create or replace function public.handle_wallet_transaction()
returns trigger as $$
begin
  update public.profiles
  set balance = balance + new.amount
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_wallet_transaction_inserted
  after insert on public.wallet_transactions
  for each row execute procedure public.handle_wallet_transaction();

-- REVIEWS
create table public.reviews (
    id uuid default gen_random_uuid() primary key,
    product_id uuid references public.products(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone" on public.reviews
    for select using (true);

create policy "Authenticated users can create reviews" on public.reviews
    for insert with check (auth.uid() = user_id);

-- STORAGE BUCKETS (Note: manual insertion might require superuser, but policies can be created)
-- Ensure to create buckets 'avatars' and 'products' via Supabase Dashboard if not existing.
-- The following policies assume buckets exist:

create policy "Public Access to avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can upload avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() = owner);

create policy "Public Access to products" on storage.objects for select using (bucket_id = 'products');
create policy "Only admin can upload products" on storage.objects for insert with check (bucket_id = 'products' and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));
