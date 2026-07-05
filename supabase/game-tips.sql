-- 打賞交易紀錄（Phase B Checkout）
create table if not exists public.game_tips (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references public.games (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  payer_id uuid not null references auth.users (id) on delete cascade,
  amount_usd numeric(10, 2) not null check (amount_usd > 0),
  platform_fee_usd numeric(10, 2) not null default 0,
  creator_net_usd numeric(10, 2) not null default 0,
  platform_fee_percent numeric(5, 2) not null default 0,
  stripe_payment_intent_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'preview', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists game_tips_game_id_idx on public.game_tips (game_id);
create index if not exists game_tips_creator_id_idx on public.game_tips (creator_id);
create index if not exists game_tips_payer_id_idx on public.game_tips (payer_id);
create index if not exists game_tips_status_idx on public.game_tips (status);

alter table public.game_tips enable row level security;

drop policy if exists "Creators read own tips" on public.game_tips;
create policy "Creators read own tips"
  on public.game_tips
  for select
  using (auth.uid() = creator_id);

drop policy if exists "Payers read own tips" on public.game_tips;
create policy "Payers read own tips"
  on public.game_tips
  for select
  using (auth.uid() = payer_id);

comment on table public.game_tips is 'Player tip transactions per game';
