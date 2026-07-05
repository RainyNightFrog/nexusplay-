-- Phase K: 收藏、追蹤創作者、打賞匿名顯示

create table if not exists public.user_game_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists user_game_favorites_user_idx
  on public.user_game_favorites (user_id, created_at desc);

alter table public.user_game_favorites enable row level security;

drop policy if exists "Users manage own favorites" on public.user_game_favorites;
create policy "Users manage own favorites"
  on public.user_game_favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.creator_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

create index if not exists creator_follows_creator_idx
  on public.creator_follows (creator_id, created_at desc);

create index if not exists creator_follows_follower_idx
  on public.creator_follows (follower_id, created_at desc);

alter table public.creator_follows enable row level security;

drop policy if exists "Users manage own follows" on public.creator_follows;
create policy "Users manage own follows"
  on public.creator_follows
  for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

drop policy if exists "Public read follow counts" on public.creator_follows;
create policy "Public read follow counts"
  on public.creator_follows
  for select
  using (true);

alter table public.game_tips
  add column if not exists public_anonymous boolean not null default false;

comment on column public.game_tips.public_anonymous is
  'When true, hide payer name on public supporter wall';
