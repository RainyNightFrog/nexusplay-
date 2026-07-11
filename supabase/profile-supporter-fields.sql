-- Supporter Pass membership fields on profiles
-- 請在 Supabase Dashboard → SQL Editor 中執行，或 npm run db:profile-supporter

alter table public.profiles
  add column if not exists is_supporter boolean not null default false,
  add column if not exists supporter_since timestamptz,
  add column if not exists supporter_badge text;

comment on column public.profiles.is_supporter is
  'Active Supporter Pass membership';
comment on column public.profiles.supporter_since is
  'When supporter status was first granted';
comment on column public.profiles.supporter_badge is
  'Badge tier key, e.g. supporter_v1';

create index if not exists profiles_is_supporter_idx
  on public.profiles (is_supporter)
  where is_supporter = true;
