-- ============================================================
-- NexusPlay 平台種子資料（追加，不覆蓋 VOID GACHA）
-- 請在 Supabase SQL Editor 執行，或使用 npm run db:seed
-- ============================================================

-- 僅追加兩款明星遊戲（若標題已存在則跳過）
insert into public.games (title, description, category, cover_url, game_url, plays_count, rating_avg, created_at)
select *
from (
  values
    (
      'CoreDefense: Mindustry X',
      '建立你的重工業採礦帝國，拉起鋼鐵防禦陣線！利用精密的輸送帶與全自動化工廠供應鏈，抵禦無窮無盡的異星機械狂潮。當核心裂變點燃，唯有鋼鐵與全自動砲塔能為你贏得最後尊嚴。',
      '策略',
      '/covers/core-defense-cover.png',
      '/demos/core-defense-preview.html',
      98500::bigint,
      4.91::numeric,
      now() - interval '12 days'
    ),
    (
      'CyberFortune 012',
      '這是一場融合了未來大數據統計與博弈策略的頭腦風暴。在霓虹交織的賽博夜城中，利用獨創的 012 矩陣與全餐對戰策略，精準推算對手的下一步。在概率的世界裡，你就是唯一的王。',
      '益智',
      '/covers/cyber-fortune-cover.png',
      '/demos/cyber-fortune-preview.html',
      64200::bigint,
      4.76::numeric,
      now() - interval '8 days'
    )
) as seed(title, description, category, cover_url, game_url, plays_count, rating_avg, created_at)
where not exists (
  select 1 from public.games g where g.title = seed.title
);

-- 論壇種子需透過 scripts/seed-platform.mjs 寫入（需 auth.users）
