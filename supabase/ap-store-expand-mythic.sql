-- ============================================================
-- AP 商店擴充：加倍選擇 + mythic（神話）稀有度
-- 執行：npm run db:ap-store-expand
-- ============================================================

-- ------------------------------------------------------------
-- 1) 放寬 rarity / rarity_tier CHECK（加入 mythic）
-- ------------------------------------------------------------
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
-- 2) 商店專屬稱號（新增 4 個）
-- ------------------------------------------------------------
insert into public.titles (id, name, css_class, rarity_tier)
values
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

-- ------------------------------------------------------------
-- 3) 新增 16 件商品
-- ------------------------------------------------------------
insert into public.ap_store_items (
  key, category, rarity, cost_ap, name, description, asset_config,
  unlock_title_id, is_limited, stock_limit, sort_order
)
values
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
