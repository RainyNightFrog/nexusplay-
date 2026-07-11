-- 平台玩家專屬編號：每位註冊用戶自動分配唯一遞增 ID，方便客服查找與問題排查

create sequence if not exists public.profile_player_number_seq
  as bigint
  start with 100001
  increment by 1
  no maxvalue
  cache 1;

alter table public.profiles
  add column if not exists player_number bigint;

comment on column public.profiles.player_number is
  '平台玩家專屬編號；註冊時自動分配，用於客服查找與問題排查';

with numbered as (
  select
    id,
    (100000 + row_number() over (order by created_at asc, id asc))::bigint as num
  from public.profiles
  where player_number is null
)
update public.profiles p
set player_number = numbered.num
from numbered
where p.id = numbered.id;

select setval(
  'public.profile_player_number_seq',
  greatest(
    coalesce((select max(player_number) from public.profiles), 100000),
    100000
  ),
  true
);

create unique index if not exists profiles_player_number_unique_idx
  on public.profiles (player_number);

alter table public.profiles
  alter column player_number set not null;

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

-- 供虛擬聊天機器人等後台流程分配 player_number
create or replace function public.allocate_profile_player_number()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.profile_player_number_seq');
$$;
