-- ============================================================
-- RainyNightFrog 成就與稱號系統 (Gamification)
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- 或執行：npm run db:achievements
-- ============================================================

-- ------------------------------------------------------------
-- 成就定義表
-- ------------------------------------------------------------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  badge_icon text not null default '🏅',
  category text not null default 'gameplay'
    check (category in ('gameplay', 'social', 'creator', 'special')),
  rarity_tier text not null default 'common'
    check (rarity_tier in ('common', 'rare', 'epic', 'legendary')),
  points int not null default 0 check (points >= 0),
  created_at timestamptz not null default now()
);

create index if not exists achievements_category_idx
  on public.achievements (category);

create index if not exists achievements_rarity_idx
  on public.achievements (rarity_tier);

-- ------------------------------------------------------------
-- 稱號定義表
-- ------------------------------------------------------------
create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  css_class text not null default 'title-tier-common',
  rarity_tier text not null default 'common'
    check (rarity_tier in ('common', 'rare', 'epic', 'legendary')),
  unlock_achievement_id uuid references public.achievements (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists titles_rarity_idx
  on public.titles (rarity_tier);

create index if not exists titles_unlock_achievement_idx
  on public.titles (unlock_achievement_id);

-- ------------------------------------------------------------
-- 使用者成就解鎖紀錄
-- ------------------------------------------------------------
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists user_achievements_achievement_idx
  on public.user_achievements (achievement_id);

create index if not exists user_achievements_unlocked_at_idx
  on public.user_achievements (unlocked_at desc);

-- ------------------------------------------------------------
-- 使用者稱號解鎖紀錄
-- ------------------------------------------------------------
create table if not exists public.user_titles (
  user_id uuid not null references auth.users (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create index if not exists user_titles_title_idx
  on public.user_titles (title_id);

-- ------------------------------------------------------------
-- profiles：當前佩戴稱號
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists equipped_title_id uuid references public.titles (id) on delete set null;

create index if not exists profiles_equipped_title_idx
  on public.profiles (equipped_title_id)
  where equipped_title_id is not null;

-- ------------------------------------------------------------
-- 解鎖成就時自動授予對應稱號
-- ------------------------------------------------------------
create or replace function public.grant_title_on_achievement_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_titles (user_id, title_id)
  select new.user_id, t.id
  from public.titles t
  where t.unlock_achievement_id = new.achievement_id
  on conflict (user_id, title_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_user_achievement_unlock_grant_title on public.user_achievements;
create trigger on_user_achievement_unlock_grant_title
  after insert on public.user_achievements
  for each row
  execute function public.grant_title_on_achievement_unlock();

-- ------------------------------------------------------------
-- 全球解鎖比例查詢函式
-- ------------------------------------------------------------
create or replace function public.get_achievement_unlock_stats()
returns table (
  achievement_id uuid,
  unlock_count bigint,
  total_users bigint,
  unlock_percent numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select count(*)::bigint as total_users from public.profiles
  )
  select
    a.id as achievement_id,
    count(ua.user_id)::bigint as unlock_count,
    t.total_users,
    case
      when t.total_users = 0 then 0
      else round((count(ua.user_id)::numeric / t.total_users::numeric) * 100, 2)
    end as unlock_percent
  from public.achievements a
  cross join totals t
  left join public.user_achievements ua on ua.achievement_id = a.id
  group by a.id, t.total_users
  order by a.created_at;
$$;

revoke all on function public.get_achievement_unlock_stats() from public;
grant execute on function public.get_achievement_unlock_stats() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 初始化範例成就與稱號（可重複執行）
-- ------------------------------------------------------------
insert into public.achievements (code, title, description, badge_icon, category, rarity_tier, points)
values
  (
    'first_win',
    '全站首勝',
    '完成你的第一場遊戲勝利，踏上傳奇之路！',
    '🏆',
    'gameplay',
    'rare',
    50
  ),
  (
    'big_tipper',
    '打賞大戶',
    '累計打賞達 HK$100，用行動支持喜愛的創作者。',
    '💰',
    'social',
    'epic',
    100
  ),
  (
    'creator_debut',
    '創作者首發',
    '發布你的第一款遊戲，正式加入創作者行列！',
    '🎨',
    'creator',
    'rare',
    75
  ),
  (
    'night_owl',
    '夜貓子玩家',
    '在凌晨 2:00–5:00 累計上線達 10 小時，黑夜是你的戰場。',
    '🌙',
    'special',
    'legendary',
    150
  )
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  badge_icon = excluded.badge_icon,
  category = excluded.category,
  rarity_tier = excluded.rarity_tier,
  points = excluded.points;

insert into public.titles (name, css_class, rarity_tier, unlock_achievement_id)
select
  v.name,
  v.css_class,
  v.rarity_tier,
  a.id
from (
  values
    ('新手冒險者', 'title-tier-common', 'common', 'first_win'),
    ('慷慨贊助人', 'title-tier-rare', 'rare', 'big_tipper'),
    ('閃耀創作者', 'title-tier-epic', 'epic', 'creator_debut'),
    ('永夜傳說', 'title-tier-legendary', 'legendary', 'night_owl')
) as v(name, css_class, rarity_tier, achievement_code)
join public.achievements a on a.code = v.achievement_code
where not exists (
  select 1
  from public.titles t
  where t.unlock_achievement_id = a.id
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.achievements enable row level security;
alter table public.titles enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_titles enable row level security;

drop policy if exists "Public read achievements" on public.achievements;
create policy "Public read achievements"
  on public.achievements
  for select
  using (true);

drop policy if exists "Public read titles" on public.titles;
create policy "Public read titles"
  on public.titles
  for select
  using (true);

drop policy if exists "Users read own achievements" on public.user_achievements;
create policy "Users read own achievements"
  on public.user_achievements
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users read own titles" on public.user_titles;
create policy "Users read own titles"
  on public.user_titles
  for select
  using (auth.uid() = user_id);
