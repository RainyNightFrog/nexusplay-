-- ============================================================
-- RainyNightFrog：每日電競任務與連續簽到
-- 執行：npm run db:daily-quests
-- ============================================================

-- ------------------------------------------------------------
-- 任務字典
-- ------------------------------------------------------------
create table if not exists public.daily_quests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  quest_type text not null
    check (quest_type in ('play_games', 'post_comment', 'leaderboard', 'daily_login')),
  target_count int not null default 1 check (target_count > 0),
  reward_ap int not null default 10 check (reward_ap >= 0),
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists daily_quests_active_sort_idx
  on public.daily_quests (active, sort_order);

-- ------------------------------------------------------------
-- 玩家每日任務進度
-- ------------------------------------------------------------
create table if not exists public.user_quest_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quest_id uuid not null references public.daily_quests (id) on delete cascade,
  quest_date date not null,
  progress int not null default 0 check (progress >= 0),
  claimed boolean not null default false,
  claimed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, quest_id, quest_date)
);

create index if not exists user_quest_progress_user_date_idx
  on public.user_quest_progress (user_id, quest_date);

create index if not exists user_quest_progress_quest_date_idx
  on public.user_quest_progress (quest_id, quest_date);

-- ------------------------------------------------------------
-- 連續簽到
-- ------------------------------------------------------------
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  streak_days int not null default 0 check (streak_days >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_login_date date,
  streak_reward_claimed_date date,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 種子任務
-- ------------------------------------------------------------
insert into public.daily_quests (code, title, description, quest_type, target_count, reward_ap, sort_order)
values
  (
    'play_2_games',
    '遊玩 2 款遊戲',
    '今天遊玩至少 2 款不同的遊戲',
    'play_games',
    2,
    20,
    10
  ),
  (
    'post_1_comment',
    '發表 1 則評論',
    '在任一遊戲頁留下一則評論',
    'post_comment',
    1,
    15,
    20
  ),
  (
    'leaderboard_climb',
    '排行榜衝榜',
    '向任一遊戲排行榜提交分數',
    'leaderboard',
    1,
    25,
    30
  )
on conflict (code) do update
set
  title = excluded.title,
  description = excluded.description,
  quest_type = excluded.quest_type,
  target_count = excluded.target_count,
  reward_ap = excluded.reward_ap,
  sort_order = excluded.sort_order,
  active = true;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.daily_quests enable row level security;
alter table public.user_quest_progress enable row level security;
alter table public.user_streaks enable row level security;

drop policy if exists "Public read active daily quests" on public.daily_quests;
create policy "Public read active daily quests"
  on public.daily_quests for select
  using (active = true);

drop policy if exists "Users read own quest progress" on public.user_quest_progress;
create policy "Users read own quest progress"
  on public.user_quest_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own quest progress" on public.user_quest_progress;
create policy "Users insert own quest progress"
  on public.user_quest_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own quest progress" on public.user_quest_progress;
create policy "Users update own quest progress"
  on public.user_quest_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own streaks" on public.user_streaks;
create policy "Users read own streaks"
  on public.user_streaks for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own streaks" on public.user_streaks;
create policy "Users insert own streaks"
  on public.user_streaks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own streaks" on public.user_streaks;
create policy "Users update own streaks"
  on public.user_streaks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.daily_quests is
  'Daily quest definitions with AP rewards';
comment on table public.user_quest_progress is
  'Per-user daily quest progress and claim state';
comment on table public.user_streaks is
  'Login streak tracking for daily check-in rewards';
