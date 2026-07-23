-- ============================================================
-- RainyNightFrog：全新 AP 商店 + 每日/每周任務（嚴格經濟）
-- 執行：npm run db:new-ap-system
--
-- 設計原則：
-- 1. 可花餘額唯一真相來源 = user_ap_wallet（profiles.ap_balance 為同步快取）
-- 2. 購買／領獎一律 security definer + FOR UPDATE，禁止前端傳入 AP 數值
-- 3. 每日產出上限約 30~45 AP；每周約 120~150 AP（不含成就入帳）
-- 4. 商店定價（×10 嚴格稀有度）：普通 1,600~2,500／稀有 7,000~9,500／史詩 24,000~34,000／傳說 52,000+／神話 125,000+（極少庫存）
-- ============================================================

-- ------------------------------------------------------------
-- 0) 餘額快取欄位（與 wallet 同步）
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists ap_balance int not null default 0 check (ap_balance >= 0);

create index if not exists profiles_ap_balance_idx
  on public.profiles (ap_balance desc);

-- 從既有錢包回填
update public.profiles p
set ap_balance = coalesce(w.balance, 0)
from public.user_ap_wallet w
where w.user_id = p.id
  and p.ap_balance is distinct from coalesce(w.balance, 0);

-- ------------------------------------------------------------
-- 1) AP 商店商品
-- ------------------------------------------------------------
create table if not exists public.ap_store_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  category text not null
    check (category in ('title', 'name_color', 'avatar_frame', 'badge_effect')),
  rarity text not null
    check (rarity in ('common', 'rare', 'epic', 'legendary', 'mythic')),
  cost_ap int not null check (cost_ap > 0),
  name text not null,
  description text not null default '',
  asset_config jsonb not null default '{}'::jsonb,
  unlock_title_id uuid references public.titles (id) on delete set null,
  is_limited boolean not null default false,
  stock_limit int check (stock_limit is null or stock_limit >= 0),
  stock_sold int not null default 0 check (stock_sold >= 0),
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ap_store_items_stock_ok
    check (stock_limit is null or stock_sold <= stock_limit)
);

create index if not exists ap_store_items_active_cat_idx
  on public.ap_store_items (active, category, sort_order);

-- 已存在資料表時補強 mythic rarity（create table if not exists 不會改 CHECK）
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ap_store_items'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%rarity%'
      and pg_get_constraintdef(con.oid) not ilike '%stock%'
  loop
    execute format('alter table public.ap_store_items drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.ap_store_items
  drop constraint if exists ap_store_items_rarity_check;

alter table public.ap_store_items
  add constraint ap_store_items_rarity_check
  check (rarity in ('common', 'rare', 'epic', 'legendary', 'mythic'));

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'titles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%rarity_tier%'
  loop
    execute format('alter table public.titles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.titles
  drop constraint if exists titles_rarity_tier_check;

alter table public.titles
  add constraint titles_rarity_tier_check
  check (rarity_tier in ('common', 'rare', 'epic', 'legendary', 'mythic'));


-- ------------------------------------------------------------
-- 2) 玩家背包
-- ------------------------------------------------------------
create table if not exists public.user_ap_inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.ap_store_items (id) on delete cascade,
  purchased_at timestamptz not null default now(),
  is_equipped boolean not null default false,
  primary key (user_id, item_id)
);

create index if not exists user_ap_inventory_user_equipped_idx
  on public.user_ap_inventory (user_id, is_equipped)
  where is_equipped = true;

-- ------------------------------------------------------------
-- 3) 經濟稽核（玩家行為；非管理員 admin_logs）
-- ------------------------------------------------------------
create table if not exists public.ap_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ap_audit_logs_user_created_idx
  on public.ap_audit_logs (user_id, created_at desc);

create index if not exists ap_audit_logs_action_idx
  on public.ap_audit_logs (action, created_at desc);

-- ------------------------------------------------------------
-- 4) 任務字典（daily / weekly）
-- ------------------------------------------------------------
create table if not exists public.quests_dictionary (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  period_type text not null check (period_type in ('daily', 'weekly')),
  quest_type text not null
    check (quest_type in (
      'play_games',
      'post_comment',
      'leaderboard',
      'daily_login',
      'weekly_login_days',
      'tip_creator',
      'unlock_achievements'
    )),
  title text not null,
  description text not null default '',
  target_count int not null default 1 check (target_count > 0),
  reward_ap int not null default 5 check (reward_ap >= 0),
  min_comment_length int not null default 0 check (min_comment_length >= 0),
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists quests_dictionary_active_period_idx
  on public.quests_dictionary (active, period_type, sort_order);

-- 舊版進度表（FK → daily_quests）改名保留，改用新結構
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'user_quest_progress'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_quest_progress'
      and column_name = 'quest_date'
  ) then
    alter table public.user_quest_progress rename to user_quest_progress_legacy_v1;
  end if;
exception when others then
  null;
end $$;

create table if not exists public.user_quest_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quest_id uuid not null references public.quests_dictionary (id) on delete cascade,
  period_key text not null,
  progress int not null default 0 check (progress >= 0),
  completed boolean not null default false,
  claimed boolean not null default false,
  claimed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, quest_id, period_key)
);

create index if not exists user_quest_progress_user_period_idx
  on public.user_quest_progress (user_id, period_key);

-- 簽到（保留）
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  streak_days int not null default 0 check (streak_days >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_login_date date,
  streak_reward_claimed_date date,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5) 種子：商店專屬稱號 + 商品（嚴格定價）
-- ------------------------------------------------------------
insert into public.titles (id, name, css_class, rarity_tier)
values
  (
    'a1000001-0001-4000-8000-000000000001',
    '霓虹新星',
    'title-ap-neon-nova',
    'common'
  ),
  (
    'a1000001-0001-4000-8000-000000000002',
    '賽博浪客',
    'title-ap-cyber-ronin',
    'rare'
  ),
  (
    'a1000001-0001-4000-8000-000000000003',
    '虛空領主',
    'title-ap-void-lord',
    'epic'
  ),
  (
    'a1000001-0001-4000-8000-000000000004',
    '雨夜帝王',
    'title-ap-rain-emperor',
    'legendary'
  ),
  (
    'a1000001-0001-4000-8000-000000000005',
    '像素旅人',
    'title-ap-pixel-wanderer',
    'common'
  ),
  (
    'a1000001-0001-4000-8000-000000000006',
    '霓虹先知',
    'title-ap-neon-oracle',
    'rare'
  ),
  (
    'a1000001-0001-4000-8000-000000000007',
    '深淵傳令',
    'title-ap-abyss-herald',
    'epic'
  ),
  (
    'a1000001-0001-4000-8000-000000000008',
    '永夜蛙神',
    'title-ap-frog-of-eternity',
    'mythic'
  )
on conflict (id) do update set
  name = excluded.name,
  css_class = excluded.css_class,
  rarity_tier = excluded.rarity_tier;

insert into public.ap_store_items (
  key, category, rarity, cost_ap, name, description, asset_config,
  unlock_title_id, is_limited, stock_limit, sort_order
)
values
  -- Titles
  (
    'title_neon_nova', 'title', 'common', 2000,
    '霓虹新星', '普通稱號：淡藍霓虹字樣',
    '{"cssClass":"title-ap-neon-nova"}'::jsonb,
    'a1000001-0001-4000-8000-000000000001', false, null, 10
  ),
  (
    'title_cyber_ronin', 'title', 'rare', 9000,
    '賽博浪客', '稀有稱號：紫青雙色漸層',
    '{"cssClass":"title-ap-cyber-ronin"}'::jsonb,
    'a1000001-0001-4000-8000-000000000002', false, null, 20
  ),
  (
    'title_void_lord', 'title', 'epic', 28000,
    '虛空領主', '史詩稱號：深空紫金光暈',
    '{"cssClass":"title-ap-void-lord"}'::jsonb,
    'a1000001-0001-4000-8000-000000000003', false, null, 30
  ),
  (
    'title_rain_emperor', 'title', 'legendary', 65000,
    '雨夜帝王', '傳說限定稱號：全站最耀眼',
    '{"cssClass":"title-ap-rain-emperor","glow":true}'::jsonb,
    'a1000001-0001-4000-8000-000000000004', true, 100, 40
  ),
  -- Name colors
  (
    'name_cyan_pulse', 'name_color', 'common', 1800,
    '青脈之名', '普通名字色：青色脈動',
    '{"cssClass":"ap-name-cyan"}'::jsonb,
    null, false, null, 110
  ),
  (
    'name_rose_flare', 'name_color', 'rare', 7500,
    '玫焰之名', '稀有名字色：玫紅閃焰',
    '{"cssClass":"ap-name-rose"}'::jsonb,
    null, false, null, 120
  ),
  (
    'name_aurora_flow', 'name_color', 'epic', 24000,
    '極光流光', '史詩名字色：極光流動漸層',
    '{"cssClass":"ap-name-aurora"}'::jsonb,
    null, false, null, 130
  ),
  (
    'name_gold_legend', 'name_color', 'legendary', 52000,
    '金傳說名', '傳說名字色：金箔光澤',
    '{"cssClass":"ap-name-gold-legend","glow":true}'::jsonb,
    null, true, 50, 140
  ),
  -- Avatar frames
  (
    'frame_cyan_ring', 'avatar_frame', 'common', 2200,
    '青環頭像框', '普通頭像框：青色細環',
    '{"cssClass":"ap-frame-cyan"}'::jsonb,
    null, false, null, 210
  ),
  (
    'frame_violet_glow', 'avatar_frame', 'rare', 8500,
    '紫輝頭像框', '稀有頭像框：紫色外輝',
    '{"cssClass":"ap-frame-violet"}'::jsonb,
    null, false, null, 220
  ),
  (
    'frame_gold_crown', 'avatar_frame', 'epic', 30000,
    '金冠頭像框', '史詩頭像框：金色冠冕',
    '{"cssClass":"ap-frame-gold"}'::jsonb,
    null, false, null, 230
  ),
  (
    'frame_void_orbit', 'avatar_frame', 'legendary', 70000,
    '虛空軌道框', '傳說頭像框：軌道粒子環',
    '{"cssClass":"ap-frame-void-orbit","animated":true}'::jsonb,
    null, true, 30, 240
  ),
  -- Badge effects (map to chat bubble / badge css)
  (
    'badge_mint_spark', 'badge_effect', 'common', 1600,
    '薄荷火花', '普通徽章特效：薄荷微光',
    '{"cssClass":"ap-bubble-mint"}'::jsonb,
    null, false, null, 310
  ),
  (
    'badge_sunset_wave', 'badge_effect', 'rare', 7000,
    '夕陽波紋', '稀有徽章特效：暖橙波紋',
    '{"cssClass":"ap-bubble-sunset"}'::jsonb,
    null, false, null, 320
  ),
  (
    'badge_void_pulse', 'badge_effect', 'epic', 26000,
    '虛空脈衝', '史詩徽章特效：深紫脈衝',
    '{"cssClass":"ap-bubble-void"}'::jsonb,
    null, false, null, 330
  ),
  (
    'badge_rain_storm', 'badge_effect', 'legendary', 58000,
    '雨夜風暴', '傳說徽章特效：電競風暴光環',
    '{"cssClass":"ap-badge-rain-storm","animated":true}'::jsonb,
    null, true, 40, 340
  ),
  -- Expanded catalog (+16) + mythic
  (
    'title_pixel_wanderer', 'title', 'common', 2500,
    '像素旅人', '普通稱號：復古像素青字',
    '{"cssClass":"title-ap-pixel-wanderer"}'::jsonb,
    'a1000001-0001-4000-8000-000000000005', false, null, 15
  ),
  (
    'title_neon_oracle', 'title', 'rare', 9500,
    '霓虹先知', '稀有稱號：粉青霓虹預言字樣',
    '{"cssClass":"title-ap-neon-oracle"}'::jsonb,
    'a1000001-0001-4000-8000-000000000006', false, null, 25
  ),
  (
    'title_abyss_herald', 'title', 'epic', 32000,
    '深淵傳令', '史詩稱號：深淵紫紅傳令光暈',
    '{"cssClass":"title-ap-abyss-herald"}'::jsonb,
    'a1000001-0001-4000-8000-000000000007', false, null, 35
  ),
  (
    'title_frog_of_eternity', 'title', 'mythic', 150000,
    '永夜蛙神', '神話限定稱號：雨夜蛙神永恆光環',
    '{"cssClass":"title-ap-frog-of-eternity","glow":true,"animated":true}'::jsonb,
    'a1000001-0001-4000-8000-000000000008', true, 10, 50
  ),
  (
    'name_lime_static', 'name_color', 'common', 2000,
    '萊姆靜電', '普通名字色：萊姆靜電微光',
    '{"cssClass":"ap-name-lime"}'::jsonb,
    null, false, null, 115
  ),
  (
    'name_ice_shard', 'name_color', 'rare', 8000,
    '冰晶裂痕', '稀有名字色：冰晶裂痕冷光',
    '{"cssClass":"ap-name-ice"}'::jsonb,
    null, false, null, 125
  ),
  (
    'name_crimson_nova', 'name_color', 'epic', 27000,
    '赤焰新星', '史詩名字色：赤焰新星漸層',
    '{"cssClass":"ap-name-crimson"}'::jsonb,
    null, false, null, 135
  ),
  (
    'name_prism_myth', 'name_color', 'mythic', 125000,
    '稜鏡神話', '神話名字色：全光譜稜鏡流動',
    '{"cssClass":"ap-name-prism-myth","glow":true,"animated":true}'::jsonb,
    null, true, 12, 150
  ),
  (
    'frame_mint_hex', 'avatar_frame', 'common', 2400,
    '薄荷六角框', '普通頭像框：薄荷六角細環',
    '{"cssClass":"ap-frame-mint-hex"}'::jsonb,
    null, false, null, 215
  ),
  (
    'frame_ember_ring', 'avatar_frame', 'rare', 9000,
    '餘燼環框', '稀有頭像框：餘燼暖橙光環',
    '{"cssClass":"ap-frame-ember"}'::jsonb,
    null, false, null, 225
  ),
  (
    'frame_crystal_prism', 'avatar_frame', 'epic', 34000,
    '水晶棱鏡框', '史詩頭像框：水晶棱鏡折射',
    '{"cssClass":"ap-frame-crystal"}'::jsonb,
    null, false, null, 235
  ),
  (
    'frame_eternal_rain', 'avatar_frame', 'mythic', 160000,
    '永雨神環', '神話頭像框：永雨粒子神環',
    '{"cssClass":"ap-frame-eternal-rain","glow":true,"animated":true}'::jsonb,
    null, true, 8, 250
  ),
  (
    'badge_sky_ripple', 'badge_effect', 'common', 1800,
    '青空漣漪', '普通徽章特效：青空漣漪',
    '{"cssClass":"ap-bubble-sky"}'::jsonb,
    null, false, null, 315
  ),
  (
    'badge_plasma_arc', 'badge_effect', 'rare', 7800,
    '電漿弧光', '稀有徽章特效：電漿弧光',
    '{"cssClass":"ap-bubble-plasma"}'::jsonb,
    null, false, null, 325
  ),
  (
    'badge_obsidian_flare', 'badge_effect', 'epic', 29000,
    '黑曜焰紋', '史詩徽章特效：黑曜焰紋',
    '{"cssClass":"ap-bubble-obsidian"}'::jsonb,
    null, false, null, 335
  ),
  (
    'badge_frog_aurora', 'badge_effect', 'mythic', 140000,
    '蛙夜極光', '神話徽章特效：蛙夜極光風暴',
    '{"cssClass":"ap-badge-frog-aurora","glow":true,"animated":true}'::jsonb,
    null, true, 10, 350
  )
on conflict (key) do update set
  category = excluded.category,
  rarity = excluded.rarity,
  cost_ap = excluded.cost_ap,
  name = excluded.name,
  description = excluded.description,
  asset_config = excluded.asset_config,
  unlock_title_id = excluded.unlock_title_id,
  is_limited = excluded.is_limited,
  stock_limit = excluded.stock_limit,
  sort_order = excluded.sort_order,
  active = true;

-- ------------------------------------------------------------
-- 6) 種子：每日 / 每周任務（嚴格產出上限）
-- Daily ≈ 5+10+5+8 = 28 AP（上限約 30~45）
-- Weekly ≈ 30+40+50 = 120 AP（上限約 120~150）
-- ------------------------------------------------------------
insert into public.quests_dictionary (
  code, period_type, quest_type, title, description,
  target_count, reward_ap, min_comment_length, sort_order
)
values
  (
    'daily_play_3', 'daily', 'play_games',
    '遊玩 3 款遊戲', '今天遊玩至少 3 款不同遊戲（同款不重複計）',
    3, 5, 0, 10
  ),
  (
    'daily_quality_comment', 'daily', 'post_comment',
    '發布高品質評論', '發表至少 1 則長度 ≥ 40 字的遊戲評論',
    1, 10, 40, 20
  ),
  (
    'daily_checkin', 'daily', 'daily_login',
    '每日簽到', '今日登入並開啟任務面板即可完成',
    1, 5, 0, 30
  ),
  (
    'daily_leaderboard', 'daily', 'leaderboard',
    '衝榜一次', '向任一遊戲排行榜提交分數',
    1, 8, 0, 40
  ),
  (
    'weekly_login_4', 'weekly', 'weekly_login_days',
    '跨 4 天登入遊玩', '本周至少 4 天有登入並觸發任務系統',
    4, 30, 0, 110
  ),
  (
    'weekly_tip_once', 'weekly', 'tip_creator',
    '打賞任一創作者', '本周完成至少 1 次真實打賞',
    1, 40, 0, 120
  ),
  (
    'weekly_achievements_2', 'weekly', 'unlock_achievements',
    '解鎖 2 個成就', '本周新解鎖任意 2 個成就',
    2, 50, 0, 130
  )
on conflict (code) do update set
  period_type = excluded.period_type,
  quest_type = excluded.quest_type,
  title = excluded.title,
  description = excluded.description,
  target_count = excluded.target_count,
  reward_ap = excluded.reward_ap,
  min_comment_length = excluded.min_comment_length,
  sort_order = excluded.sort_order,
  active = true;

-- 停用舊版高產出每日任務（若存在）
update public.daily_quests
set active = false
where code in ('play_2_games', 'post_1_comment', 'leaderboard_climb');

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.ap_store_items enable row level security;
alter table public.user_ap_inventory enable row level security;
alter table public.ap_audit_logs enable row level security;
alter table public.quests_dictionary enable row level security;
alter table public.user_quest_progress enable row level security;
alter table public.user_streaks enable row level security;

drop policy if exists "Public read active ap store items" on public.ap_store_items;
create policy "Public read active ap store items"
  on public.ap_store_items for select
  using (active = true);

drop policy if exists "Users read own ap inventory" on public.user_ap_inventory;
create policy "Users read own ap inventory"
  on public.user_ap_inventory for select
  using (auth.uid() = user_id);

drop policy if exists "Users read own ap audit logs" on public.ap_audit_logs;
create policy "Users read own ap audit logs"
  on public.ap_audit_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Public read active quests dictionary" on public.quests_dictionary;
create policy "Public read active quests dictionary"
  on public.quests_dictionary for select
  using (active = true);

drop policy if exists "Users read own quest progress v2" on public.user_quest_progress;
create policy "Users read own quest progress v2"
  on public.user_quest_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users read own streaks" on public.user_streaks;
create policy "Users read own streaks"
  on public.user_streaks for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 強化 credit_ap：同步 profiles.ap_balance + FOR UPDATE
-- ------------------------------------------------------------
create or replace function public.credit_ap(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_exists boolean;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    return false;
  end if;

  if p_reason is null or trim(p_reason) = '' then
    return false;
  end if;

  if p_ref_type is not null and p_ref_id is not null then
    select exists (
      select 1 from public.ap_ledger
      where user_id = p_user_id
        and reason = p_reason
        and ref_type = p_ref_type
        and ref_id = p_ref_id
    ) into v_exists;
    if v_exists then
      return false;
    end if;
  end if;

  insert into public.user_ap_wallet (user_id, balance, lifetime_earned, updated_at)
  values (p_user_id, 0, 0, now())
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.user_ap_wallet
  where user_id = p_user_id
  for update;

  v_balance := coalesce(v_balance, 0) + p_amount;

  update public.user_ap_wallet
  set
    balance = v_balance,
    lifetime_earned = lifetime_earned + p_amount,
    updated_at = now()
  where user_id = p_user_id;

  update public.profiles
  set ap_balance = v_balance
  where id = p_user_id;

  insert into public.ap_ledger (user_id, delta, balance_after, reason, ref_type, ref_id)
  values (p_user_id, p_amount, v_balance, p_reason, p_ref_type, p_ref_id);

  return true;
end;
$$;

revoke all on function public.credit_ap(uuid, int, text, text, text) from public;
grant execute on function public.credit_ap(uuid, int, text, text, text) to service_role;

-- ------------------------------------------------------------
-- 原子購買：purchase_ap_item(p_user_id, p_item_id)
-- ------------------------------------------------------------
create or replace function public.purchase_ap_item(
  p_user_id uuid,
  p_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.ap_store_items%rowtype;
  v_balance int;
  v_new_balance int;
  v_owned boolean;
begin
  if p_user_id is null or p_item_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  select * into v_item
  from public.ap_store_items
  where id = p_item_id and active = true
  for update;

  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  if v_item.stock_limit is not null and v_item.stock_sold >= v_item.stock_limit then
    return jsonb_build_object('ok', false, 'error', 'out_of_stock');
  end if;

  select exists (
    select 1 from public.user_ap_inventory
    where user_id = p_user_id and item_id = v_item.id
  ) into v_owned;

  if v_owned then
    return jsonb_build_object('ok', false, 'error', 'already_owned');
  end if;

  insert into public.user_ap_wallet (user_id, balance, lifetime_earned, updated_at)
  values (p_user_id, 0, 0, now())
  on conflict (user_id) do nothing;

  -- 鎖定錢包（真實餘額）+ 同步 profiles.ap_balance
  select balance into v_balance
  from public.user_ap_wallet
  where user_id = p_user_id
  for update;

  perform 1 from public.profiles where id = p_user_id for update;

  if coalesce(v_balance, 0) < v_item.cost_ap then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_balance',
      'balance', coalesce(v_balance, 0),
      'cost', v_item.cost_ap
    );
  end if;

  v_new_balance := v_balance - v_item.cost_ap;

  update public.user_ap_wallet
  set balance = v_new_balance, updated_at = now()
  where user_id = p_user_id;

  update public.profiles
  set ap_balance = v_new_balance
  where id = p_user_id;

  insert into public.ap_ledger (user_id, delta, balance_after, reason, ref_type, ref_id)
  values (
    p_user_id,
    -v_item.cost_ap,
    v_new_balance,
    'store_purchase',
    'ap_store_item',
    v_item.id::text
  );

  insert into public.user_ap_inventory (user_id, item_id, purchased_at, is_equipped)
  values (p_user_id, v_item.id, now(), false);

  update public.ap_store_items
  set stock_sold = stock_sold + 1
  where id = v_item.id;

  if v_item.category = 'title' and v_item.unlock_title_id is not null then
    insert into public.user_titles (user_id, title_id)
    values (p_user_id, v_item.unlock_title_id)
    on conflict (user_id, title_id) do nothing;
  end if;

  insert into public.ap_audit_logs (user_id, action, details)
  values (
    p_user_id,
    'ap_purchase',
    jsonb_build_object(
      'item_id', v_item.id,
      'item_key', v_item.key,
      'cost_ap', v_item.cost_ap,
      'balance_after', v_new_balance
    )
  );

  -- 若存在 admin_logs，附帶稽核列（非管理員操作，user_id 記在 details）
  begin
    insert into public.admin_logs (admin_id, action, details)
    values (
      p_user_id,
      'ap_store_purchase',
      format('user=%s item=%s cost=%s balance=%s', p_user_id, v_item.key, v_item.cost_ap, v_new_balance)
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok', true,
    'item_id', v_item.id,
    'item_key', v_item.key,
    'category', v_item.category,
    'cost_ap', v_item.cost_ap,
    'balance', v_new_balance,
    'title_id', v_item.unlock_title_id
  );
end;
$$;

-- 兼容舊簽名 purchase_ap_item(uuid, text) → 轉呼叫新表 by key
create or replace function public.purchase_ap_item(
  p_user_id uuid,
  p_item_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.ap_store_items where key = trim(p_item_code) and active;
  if v_id is null then
    -- fallback 舊 ap_shop_items.code
    select id into v_id from public.ap_shop_items where code = trim(p_item_code) and active;
    if v_id is null then
      return jsonb_build_object('ok', false, 'error', 'item_not_found');
    end if;
    -- 舊表：導向既有扣款邏輯會較複雜；直接拒絕並提示用新商店
    return jsonb_build_object('ok', false, 'error', 'legacy_item_disabled');
  end if;
  return public.purchase_ap_item(p_user_id, v_id);
end;
$$;

revoke all on function public.purchase_ap_item(uuid, uuid) from public;
grant execute on function public.purchase_ap_item(uuid, uuid) to service_role;
revoke all on function public.purchase_ap_item(uuid, text) from public;
grant execute on function public.purchase_ap_item(uuid, text) to service_role;

-- ------------------------------------------------------------
-- 裝備外觀（同分類互斥）
-- ------------------------------------------------------------
create or replace function public.equip_ap_item(
  p_user_id uuid,
  p_item_id uuid,
  p_equip boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.ap_store_items%rowtype;
  v_owned boolean;
  v_css text;
begin
  if p_user_id is null or p_item_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  select * into v_item from public.ap_store_items where id = p_item_id;
  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  select exists (
    select 1 from public.user_ap_inventory
    where user_id = p_user_id and item_id = p_item_id
  ) into v_owned;

  if not v_owned then
    return jsonb_build_object('ok', false, 'error', 'not_owned');
  end if;

  v_css := coalesce(v_item.asset_config->>'cssClass', '');

  -- 同分類全部卸下
  update public.user_ap_inventory u
  set is_equipped = false
  from public.ap_store_items i
  where u.item_id = i.id
    and u.user_id = p_user_id
    and i.category = v_item.category;

  if p_equip then
    update public.user_ap_inventory
    set is_equipped = true
    where user_id = p_user_id and item_id = p_item_id;

    if v_item.category = 'avatar_frame' then
      update public.profiles set equipped_avatar_frame = v_item.key where id = p_user_id;
    elsif v_item.category = 'name_color' then
      update public.profiles set equipped_name_color = v_item.key where id = p_user_id;
    elsif v_item.category = 'badge_effect' then
      update public.profiles set equipped_chat_bubble = v_item.key where id = p_user_id;
    elsif v_item.category = 'title' and v_item.unlock_title_id is not null then
      update public.profiles set equipped_title_id = v_item.unlock_title_id where id = p_user_id;
    end if;
  else
    if v_item.category = 'avatar_frame' then
      update public.profiles set equipped_avatar_frame = null where id = p_user_id;
    elsif v_item.category = 'name_color' then
      update public.profiles set equipped_name_color = null where id = p_user_id;
    elsif v_item.category = 'badge_effect' then
      update public.profiles set equipped_chat_bubble = null where id = p_user_id;
    elsif v_item.category = 'title' then
      update public.profiles
      set equipped_title_id = null
      where id = p_user_id and equipped_title_id = v_item.unlock_title_id;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'item_id', v_item.id,
    'item_key', v_item.key,
    'category', v_item.category,
    'equipped', p_equip,
    'css_class', v_css
  );
end;
$$;

revoke all on function public.equip_ap_item(uuid, uuid, boolean) from public;
grant execute on function public.equip_ap_item(uuid, uuid, boolean) to service_role;

-- ------------------------------------------------------------
-- 領取任務獎勵（原子）
-- ------------------------------------------------------------
create or replace function public.claim_quest_reward(
  p_user_id uuid,
  p_quest_id uuid,
  p_period_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest public.quests_dictionary%rowtype;
  v_progress public.user_quest_progress%rowtype;
  v_credited boolean;
begin
  if p_user_id is null or p_quest_id is null or p_period_key is null or trim(p_period_key) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  select * into v_quest
  from public.quests_dictionary
  where id = p_quest_id and active = true;

  if v_quest.id is null then
    return jsonb_build_object('ok', false, 'error', 'quest_not_found');
  end if;

  select * into v_progress
  from public.user_quest_progress
  where user_id = p_user_id
    and quest_id = p_quest_id
    and period_key = trim(p_period_key)
  for update;

  if v_progress.id is null then
    return jsonb_build_object('ok', false, 'error', 'progress_not_found');
  end if;

  if not v_progress.completed and v_progress.progress < v_quest.target_count then
    return jsonb_build_object('ok', false, 'error', 'not_completed');
  end if;

  if v_progress.claimed then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;

  update public.user_quest_progress
  set
    completed = true,
    claimed = true,
    claimed_at = now(),
    updated_at = now()
  where id = v_progress.id;

  v_credited := public.credit_ap(
    p_user_id,
    v_quest.reward_ap,
    case when v_quest.period_type = 'weekly' then 'weekly_quest' else 'daily_quest' end,
    'quest',
    v_quest.code || ':' || trim(p_period_key)
  );

  insert into public.ap_audit_logs (user_id, action, details)
  values (
    p_user_id,
    'quest_claim',
    jsonb_build_object(
      'quest_id', v_quest.id,
      'quest_code', v_quest.code,
      'period_key', trim(p_period_key),
      'reward_ap', v_quest.reward_ap,
      'credited', v_credited
    )
  );

  return jsonb_build_object(
    'ok', true,
    'quest_code', v_quest.code,
    'reward_ap', v_quest.reward_ap,
    'credited', v_credited
  );
end;
$$;

revoke all on function public.claim_quest_reward(uuid, uuid, text) from public;
grant execute on function public.claim_quest_reward(uuid, uuid, text) to service_role;

-- 高階成就額外 AP 補貼（雨夜核心等）
create or replace function public.credit_achievement_ap_bonus(
  p_user_id uuid,
  p_achievement_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus int := 0;
begin
  if p_achievement_code in ('rainy_night_core', 'rainynight_core', 'platform_core') then
    v_bonus := 25;
  elsif p_achievement_code like '%legendary%' or p_achievement_code like '%core%' then
    v_bonus := 15;
  else
    return false;
  end if;

  return public.credit_ap(
    p_user_id,
    v_bonus,
    'achievement_ap_bonus',
    'achievement_code',
    p_achievement_code
  );
end;
$$;

revoke all on function public.credit_achievement_ap_bonus(uuid, text) from public;
grant execute on function public.credit_achievement_ap_bonus(uuid, text) to service_role;

comment on table public.ap_store_items is 'New AP store catalog with strict economy pricing';
comment on table public.user_ap_inventory is 'Owned AP cosmetics; unique per user/item';
comment on table public.quests_dictionary is 'Daily/weekly quest definitions with capped AP rewards';
