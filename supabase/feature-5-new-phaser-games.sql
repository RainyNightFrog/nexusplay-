-- ============================================================
-- RainyNightFrog：5 款新 Phaser 3 遊戲 featured 設定
-- 說明：
-- 1. 將 featured 狀態正式寫入 public.games
-- 2. 以 slug 比對，可安全重複執行
-- 3. 僅更新指定 5 款遊戲，不影響其他作品
-- ============================================================

with featured_config as (
  select *
  from (
    values
      ('cyber-blade-dash', true, 950, 'Phaser 3 新銳'),
      ('void-rhythm-beat', true, 940, '節奏焦點'),
      ('cyber-rogue-dungeon', true, 930, '倖存熱作'),
      ('neon-pinball-frenzy', false, 0, null),
      ('astro-gravity-runner', false, 0, null)
  ) as seed(slug, is_featured, featured_sort, featured_badge)
)
update public.games as g
set
  is_featured = cfg.is_featured,
  featured_sort = cfg.featured_sort,
  featured_badge = cfg.featured_badge
from featured_config as cfg
where g.slug = cfg.slug;
