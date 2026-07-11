-- Checkout orders: game purchases and Supporter Pass
-- 請在 Supabase Dashboard → SQL Editor 中執行，或 npm run db:orders-checkout

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  game_id bigint references public.games (id) on delete set null,
  order_type text not null
    check (order_type in ('game_purchase', 'supporter_pass')),
  game_price_cents integer not null default 0
    check (game_price_cents >= 0),
  platform_tip_cents integer not null default 0
    check (platform_tip_cents >= 0),
  total_amount_cents integer not null
    check (total_amount_cents >= 0),
  stripe_session_id text,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  constraint orders_total_amount_check
    check (total_amount_cents = game_price_cents + platform_tip_cents),
  constraint orders_type_game_id_check
    check (
      (order_type = 'game_purchase' and game_id is not null)
      or (order_type = 'supporter_pass')
    ),
  constraint orders_amount_positive_check
    check (total_amount_cents > 0)
);

create unique index if not exists orders_stripe_session_id_idx
  on public.orders (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_game_id_idx on public.orders (game_id);
create index if not exists orders_order_type_idx on public.orders (order_type);
create index if not exists orders_status_idx on public.orders (status);

alter table public.orders enable row level security;

drop policy if exists "Buyers read own orders" on public.orders;
create policy "Buyers read own orders"
  on public.orders
  for select
  using (auth.uid() = buyer_id);

drop policy if exists "Service role orders" on public.orders;
create policy "Service role orders"
  on public.orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.orders is
  'Stripe checkout orders: game purchases and Supporter Pass';
comment on column public.orders.game_price_cents is
  'Game or pass base price in cents';
comment on column public.orders.platform_tip_cents is
  'Optional platform tip in cents (default 0)';
comment on column public.orders.total_amount_cents is
  'game_price_cents + platform_tip_cents';
comment on column public.orders.stripe_session_id is
  'Stripe Checkout Session ID for webhook idempotency';
