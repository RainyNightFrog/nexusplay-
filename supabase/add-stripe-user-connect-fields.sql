-- Stripe Connect 使用者欄位（stripe_account_id、stripe_details_submitted）
-- 與既有 stripe_connect_account_id 並存，寫入時保持同步
-- npm run db:stripe-user-fields

alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_details_submitted boolean not null default false;

comment on column public.profiles.stripe_account_id is
  'Stripe Connect Express account ID (canonical); mirrors stripe_connect_account_id';
comment on column public.profiles.stripe_details_submitted is
  'Whether Stripe onboarding details have been submitted';

update public.profiles
set
  stripe_account_id = coalesce(stripe_account_id, stripe_connect_account_id),
  stripe_details_submitted = case
    when payout_status in ('pending', 'active', 'restricted') then true
    else stripe_details_submitted
  end
where stripe_connect_account_id is not null
   or payout_status in ('pending', 'active', 'restricted');

create index if not exists profiles_stripe_account_id_idx
  on public.profiles (stripe_account_id)
  where stripe_account_id is not null;
