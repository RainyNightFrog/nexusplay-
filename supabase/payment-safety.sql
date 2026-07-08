-- 金流安全：Webhook 去重、提領防重複、打賞部分退款追蹤

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at desc);

alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Service role stripe webhook events" on public.stripe_webhook_events;
create policy "Service role stripe webhook events"
  on public.stripe_webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.game_tips
  add column if not exists creator_refunded_usd numeric(12, 2) not null default 0;

comment on column public.game_tips.creator_refunded_usd is
  'Cumulative creator-net amount reversed via refunds/disputes';

create unique index if not exists creator_payouts_one_inflight_per_creator
  on public.creator_payouts (creator_id)
  where status in ('pending', 'processing');
