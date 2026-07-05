-- Billing address on profiles (receipts / invoices)
alter table public.profiles
  add column if not exists billing_name text,
  add column if not exists billing_line1 text,
  add column if not exists billing_line2 text,
  add column if not exists billing_city text,
  add column if not exists billing_region text,
  add column if not exists billing_postal text,
  add column if not exists billing_country text;

comment on column public.profiles.billing_name is 'Legal or receipt name for billing';
comment on column public.profiles.billing_country is 'ISO-style country code or name, e.g. HK';

-- Creator API keys (hashed; full key shown once on create)
create table if not exists public.creator_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint creator_api_keys_name_check check (char_length(trim(name)) >= 1)
);

create index if not exists creator_api_keys_user_id_idx
  on public.creator_api_keys (user_id);

create unique index if not exists creator_api_keys_hash_idx
  on public.creator_api_keys (key_hash);

alter table public.creator_api_keys enable row level security;

drop policy if exists "Users manage own api keys" on public.creator_api_keys;
create policy "Users manage own api keys"
  on public.creator_api_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Service role api keys" on public.creator_api_keys;
create policy "Service role api keys"
  on public.creator_api_keys
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
