-- ============================================================
-- RainyNightFrog：新增 5 款全新 Phaser 3 電競小遊戲
-- 寫入 public.games，並隨機綁定現有 creator profiles
-- 說明：
-- 1. 依專案現有 schema 使用 cover_url / publish_status / status
-- 2. 創作者來源為 public.profiles.role = 'creator'
-- 3. 若 creator 數量 >= 5，則本批 5 款遊戲會分配給 5 位隨機且不重複的 creator
-- 4. 若 creator 數量 < 5，則會以隨機順序循環分配
-- 5. 以 slug 去重，可安全重複執行
-- ============================================================

do $$
declare
  creator_count integer;
begin
  select count(*)
  into creator_count
  from public.profiles
  where role = 'creator';

  if creator_count = 0 then
    raise exception '找不到任何 creator profile；請先建立至少一位 public.profiles.role = ''creator'' 的使用者。';
  end if;
end $$;

with creators as (
  select
    id,
    row_number() over (order by random()) as rn
  from public.profiles
  where role = 'creator'
),
creator_stats as (
  select count(*)::integer as total
  from creators
),
new_games as (
  select
    row_number() over (order by slug) as rn,
    title,
    slug,
    description,
    category,
    cover_url,
    game_url
  from (
    values
      (
        '星際重力翻轉者',
        'astro-gravity-runner',
        '翻轉重力穿越星際裂縫，在失重跑道中閃避脈衝陷阱並連續衝刺破關。',
        'Platformer',
        '/games/astro-gravity-runner/cover.svg',
        '/games/astro-gravity-runner/index.html'
      ),
      (
        '賽博光刃切擊',
        'cyber-blade-dash',
        '揮舞霓虹光刃切碎敵方無人機，連續斬擊累積超光速連段與終結爆發。',
        'Action',
        '/games/cyber-blade-dash/cover.svg',
        '/games/cyber-blade-dash/index.html'
      ),
      (
        '賽博地牢倖存者',
        'cyber-rogue-dungeon',
        '深入賽博地牢對抗失控機械潮，收集模組升級火力並撐過逐層強化的倖存挑戰。',
        'Roguelike',
        '/games/cyber-rogue-dungeon/cover.svg',
        '/games/cyber-rogue-dungeon/index.html'
      ),
      (
        '霓虹狂暴彈珠台',
        'neon-pinball-frenzy',
        '擊發高能鋼珠衝擊霓虹目標板，在多重反彈與連鎖加分中引爆全場狂熱模式。',
        'Arcade',
        '/games/neon-pinball-frenzy/cover.svg',
        '/games/neon-pinball-frenzy/index.html'
      ),
      (
        '虛空節奏拍點',
        'void-rhythm-beat',
        '跟隨虛空脈衝敲擊節奏光軌，以 Perfect 連擊壓制失序雜訊並刷新最高分。',
        'Rhythm',
        '/games/void-rhythm-beat/cover.svg',
        '/games/void-rhythm-beat/index.html'
      )
  ) as seed(title, slug, description, category, cover_url, game_url)
),
assigned_games as (
  select
    ng.title,
    ng.slug,
    ng.description,
    ng.category,
    ng.cover_url,
    ng.game_url,
    coalesce(distinct_creator.id, fallback_creator.id) as creator_id
  from new_games ng
  cross join creator_stats cs
  left join creators distinct_creator
    on cs.total >= 5
   and distinct_creator.rn = ng.rn
  left join creators fallback_creator
    on cs.total < 5
   and fallback_creator.rn = ((ng.rn - 1) % greatest(cs.total, 1)) + 1
)
insert into public.games (
  title,
  slug,
  description,
  category,
  cover_url,
  game_url,
  creator_id,
  publish_status,
  status
)
select
  ag.title,
  ag.slug,
  ag.description,
  ag.category,
  ag.cover_url,
  ag.game_url,
  ag.creator_id,
  'public',
  'approved'
from assigned_games ag
where not exists (
  select 1
  from public.games g
  where g.slug = ag.slug
);
