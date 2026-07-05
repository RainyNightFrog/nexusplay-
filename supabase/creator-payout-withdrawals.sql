-- 創作者提領紀錄
create table if not exists public.creator_payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  amount_usd numeric(12, 2) not null,
  status text not null default 'pending',
  mode text not null default 'preview',
  stripe_payout_id text,
  stripe_connect_account_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint creator_payouts_amount_check check (amount_usd > 0),
  constraint creator_payouts_status_check check (
    status in ('pending', 'processing', 'paid', 'failed', 'preview_paid')
  ),
  constraint creator_payouts_mode_check check (mode in ('preview', 'live'))
);

create index if not exists creator_payouts_creator_id_idx
  on public.creator_payouts (creator_id, created_at desc);

alter table public.creator_payouts enable row level security;

drop policy if exists "Creators read own payouts" on public.creator_payouts;
create policy "Creators read own payouts"
  on public.creator_payouts
  for select
  using (auth.uid() = creator_id);

drop policy if exists "Service role creator payouts" on public.creator_payouts;
create policy "Service role creator payouts"
  on public.creator_payouts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
