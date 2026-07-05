-- 創作者收款／Stripe Connect 狀態（Phase B）
alter table public.profiles
  add column if not exists stripe_connect_account_id text,
  add column if not exists payout_status text not null default 'none',
  add column if not exists creator_balance_usd numeric(12, 2) not null default 0,
  add column if not exists payout_onboarded_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_payout_status_check;

alter table public.profiles
  add constraint profiles_payout_status_check
  check (payout_status in ('none', 'pending', 'active', 'restricted'));

comment on column public.profiles.stripe_connect_account_id is
  'Stripe Connect Express account ID; server-managed only';
comment on column public.profiles.payout_status is
  'none | pending | active | restricted';
comment on column public.profiles.creator_balance_usd is
  'Accumulated creator balance awaiting payout (USD)';
comment on column public.profiles.payout_onboarded_at is
  'When Stripe Connect onboarding was first completed';

-- 玩家儲存付款方式（Phase B 預留）
alter table public.profiles
  add column if not exists stripe_customer_id text;

comment on column public.profiles.stripe_customer_id is
  'Stripe Customer ID for saved payment methods; server-managed only';
