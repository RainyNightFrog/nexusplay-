-- ============================================================
-- RainyNightFrog Auth：profiles 表與註冊觸發器
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- ============================================================

create sequence if not exists public.profile_player_number_seq
  as bigint
  start with 100001
  increment by 1
  no maxvalue
  cache 1;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'player' check (role in ('player', 'creator')),
  player_number bigint unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role text;
begin
  selected_role := coalesce(new.raw_user_meta_data->>'role', 'player');
  if selected_role not in ('player', 'creator') then
    selected_role := 'player';
  end if;

  insert into public.profiles (id, display_name, role, player_number)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1)
    ),
    selected_role,
    nextval('public.profile_player_number_seq')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
