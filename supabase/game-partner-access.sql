-- Partner / media preview access codes for draft games
create table if not exists public.game_access_codes (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references public.games (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  label text,
  max_uses integer,
  use_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint game_access_codes_code_check check (char_length(code) >= 6),
  constraint game_access_codes_use_count_check check (use_count >= 0)
);

create unique index if not exists game_access_codes_code_idx
  on public.game_access_codes (lower(code));

create index if not exists game_access_codes_game_id_idx
  on public.game_access_codes (game_id);

create index if not exists game_access_codes_creator_id_idx
  on public.game_access_codes (creator_id);

alter table public.game_access_codes enable row level security;

drop policy if exists "Creators manage own access codes" on public.game_access_codes;
create policy "Creators manage own access codes"
  on public.game_access_codes
  for all
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "Service role full access codes" on public.game_access_codes;
create policy "Service role full access codes"
  on public.game_access_codes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
