-- ============================================================
-- RainyNightFrog：開發日誌 (Devlog) 與願望單 (Wishlist)
-- 執行：npm run db:devlog-wishlist
-- ============================================================

-- ------------------------------------------------------------
-- games：即將推出標記
-- ------------------------------------------------------------
alter table public.games
  add column if not exists is_upcoming boolean not null default false;

create index if not exists games_is_upcoming_idx
  on public.games (is_upcoming)
  where is_upcoming = true;

-- ------------------------------------------------------------
-- 願望單
-- ------------------------------------------------------------
create table if not exists public.game_wishlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists game_wishlists_game_idx
  on public.game_wishlists (game_id, created_at desc);

create index if not exists game_wishlists_user_idx
  on public.game_wishlists (user_id, created_at desc);

-- ------------------------------------------------------------
-- 開發日誌（正規化表；與 games.devlog_entries JSONB 並存）
-- ------------------------------------------------------------
create table if not exists public.game_devlogs (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references public.games (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content_html text not null default '',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_devlogs_game_published_idx
  on public.game_devlogs (game_id, published_at desc);

create index if not exists game_devlogs_creator_idx
  on public.game_devlogs (creator_id, published_at desc);

-- ------------------------------------------------------------
-- 通知 kind：願望單遊戲發布 Devlog
-- ------------------------------------------------------------
alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check
  check (
    kind in (
      'tip_received',
      'forum_reply',
      'followed_new_game',
      'wishlist_devlog'
    )
  );

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.game_wishlists enable row level security;
alter table public.game_devlogs enable row level security;

drop policy if exists "Users manage own wishlists" on public.game_wishlists;
create policy "Users manage own wishlists"
  on public.game_wishlists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public read game wishlists count" on public.game_wishlists;
create policy "Public read game wishlists count"
  on public.game_wishlists
  for select
  using (true);

drop policy if exists "Public read game devlogs" on public.game_devlogs;
create policy "Public read game devlogs"
  on public.game_devlogs
  for select
  using (true);

drop policy if exists "Creators insert own game devlogs" on public.game_devlogs;
create policy "Creators insert own game devlogs"
  on public.game_devlogs
  for insert
  with check (
    auth.uid() = creator_id
    and exists (
      select 1
      from public.games g
      where g.id = game_id
        and g.creator_id = auth.uid()
    )
  );

drop policy if exists "Creators update own game devlogs" on public.game_devlogs;
create policy "Creators update own game devlogs"
  on public.game_devlogs
  for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "Creators delete own game devlogs" on public.game_devlogs;
create policy "Creators delete own game devlogs"
  on public.game_devlogs
  for delete
  using (auth.uid() = creator_id);

comment on column public.games.is_upcoming is
  'True when the game is upcoming / wishlistable instead of playable';
comment on table public.game_wishlists is
  'Players who wishlisted an upcoming (or any) game';
comment on table public.game_devlogs is
  'Creator-authored rich-text development logs per game';
