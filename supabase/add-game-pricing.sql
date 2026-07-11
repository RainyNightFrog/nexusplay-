-- 遊戲定價設定（免費 / 固定價格 / 隨意付費 PWYW）
-- 請在 Supabase Dashboard → SQL Editor 中執行，或 npm run db:pricing

alter table public.games
  add column if not exists price integer not null default 0,
  add column if not exists currency text not null default 'USD',
  add column if not exists pricing_type text not null default 'free',
  add column if not exists min_price integer not null default 0;

alter table public.games
  drop constraint if exists games_pricing_type_check;

alter table public.games
  add constraint games_pricing_type_check
  check (pricing_type in ('free', 'fixed', 'pwyw'));

alter table public.games
  drop constraint if exists games_price_non_negative_check;

alter table public.games
  add constraint games_price_non_negative_check
  check (price >= 0);

alter table public.games
  drop constraint if exists games_min_price_non_negative_check;

alter table public.games
  add constraint games_min_price_non_negative_check
  check (min_price >= 0);

update public.games
set
  pricing_type = 'free',
  price = 0,
  min_price = 0,
  currency = coalesce(nullif(trim(currency), ''), 'USD')
where pricing_type is null or pricing_type = '';

create index if not exists games_pricing_type_idx
  on public.games (pricing_type);
