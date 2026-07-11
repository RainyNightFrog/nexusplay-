-- 遊戲購買授權（Webhook 結帳成功後授予下載／遊玩權限）
-- 請在 Supabase Dashboard → SQL Editor 中執行，或 npm run db:game-entitlements

create table if not exists public.game_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint game_entitlements_user_game_unique unique (user_id, game_id)
);

create index if not exists game_entitlements_user_id_idx
  on public.game_entitlements (user_id);

create index if not exists game_entitlements_game_id_idx
  on public.game_entitlements (game_id);

alter table public.game_entitlements enable row level security;

drop policy if exists "Users read own entitlements" on public.game_entitlements;
create policy "Users read own entitlements"
  on public.game_entitlements
  for select
  using (auth.uid() = user_id);

drop policy if exists "Service role game entitlements" on public.game_entitlements;
create policy "Service role game entitlements"
  on public.game_entitlements
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.game_entitlements is
  'Paid game access granted after successful checkout';
