-- ============================================================
-- NexusPlay 成就擴充 + 進度目標欄位
-- 請在 achievements-titles.sql 之後執行
-- 或執行：npm run db:achievements-expand
-- ============================================================

alter table public.achievements
  add column if not exists progress_target int not null default 1
    check (progress_target >= 1);

-- 更新既有成就進度目標
update public.achievements set progress_target = 1 where code = 'first_win';
update public.achievements set progress_target = 100 where code = 'big_tipper';
update public.achievements set progress_target = 1 where code = 'creator_debut';
update public.achievements set progress_target = 36000 where code = 'night_owl';

insert into public.achievements (code, title, description, badge_icon, category, rarity_tier, points, progress_target)
values
  ('playtime_1h', '初入江湖', '累計遊玩達 1 小時，正式踏上冒險旅程。', '⚔️', 'gameplay', 'common', 20, 3600),
  ('playtime_10h', '沉浸玩家', '累計遊玩達 10 小時，已無法自拔。', '🎮', 'gameplay', 'rare', 60, 36000),
  ('games_played_5', '多棲玩家', '體驗 5 款不同遊戲，展現你的探索精神。', '🌐', 'gameplay', 'rare', 40, 5),
  ('leaderboard_submit', '榜上有名', '首次向遊戲排行榜提交分數，競技之路從此開始。', '📊', 'gameplay', 'common', 25, 1),
  ('win_collector', '勝場收集者', '累計獲得 5 場遊戲勝利，實力不容小覷。', '🔥', 'gameplay', 'epic', 85, 5),
  ('first_comment', '初試啼聲', '發表你的第一則遊戲評論。', '💬', 'social', 'common', 15, 1),
  ('forum_debut', '論壇新星', '在社群論壇發表第一篇貼文。', '📝', 'social', 'rare', 35, 1),
  ('chat_regular', '聊天室常客', '在聊天室累計發言 20 次，社群因你而熱鬧。', '🗣️', 'social', 'common', 25, 20),
  ('favorites_5', '收藏家', '收藏 5 款喜愛的遊戲，建立專屬遊戲庫。', '❤️', 'social', 'rare', 30, 5),
  ('social_butterfly', '社交流浪者', '評論、論壇與聊天累計互動達 30 次。', '🦋', 'social', 'epic', 75, 30),
  ('creator_3_games', '多產創作者', '發布 3 款公開遊戲，創意源源不絕。', '🚀', 'creator', 'epic', 120, 3),
  ('creator_first_tip', '第一桶金', '收到玩家的第一筆打賞支持。', '💎', 'creator', 'rare', 50, 1),
  ('creator_community', '社群之聲', '你的作品累計收到 10 則玩家評論。', '📣', 'creator', 'rare', 45, 10),
  ('online_10h', '線上常客', '累計上線達 10 小時，NexusPlay 是你第二個家。', '🌐', 'special', 'rare', 55, 36000),
  ('veteran_30d', '資深玩家', '加入 NexusPlay 滿 30 天，見證平台成長。', '🎖️', 'special', 'epic', 90, 30),
  ('profile_complete', '完美檔案', '填寫完整的個人資料（名稱、網站或社群帳號）。', '✨', 'special', 'common', 20, 1),
  ('donation_starter', '小小支持者', '完成第一筆打賞，向創作者表達感謝。', '🎁', 'social', 'common', 20, 1),
  ('playtime_50h', '傳奇肝帝', '累計遊玩達 50 小時，真正的硬核玩家。', '👑', 'gameplay', 'legendary', 150, 180000)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  badge_icon = excluded.badge_icon,
  category = excluded.category,
  rarity_tier = excluded.rarity_tier,
  points = excluded.points,
  progress_target = excluded.progress_target;

-- 新增稱號（僅史詩 / 傳奇級新成就）
insert into public.titles (name, css_class, rarity_tier, unlock_achievement_id)
select v.name, v.css_class, v.rarity_tier, a.id
from (
  values
    ('勝場獵人', 'title-tier-epic', 'epic', 'win_collector'),
    ('社交達人', 'title-tier-epic', 'epic', 'social_butterfly'),
    ('創作大師', 'title-tier-epic', 'epic', 'creator_3_games'),
    ('傳奇肝帝', 'title-tier-legendary', 'legendary', 'playtime_50h')
) as v(name, css_class, rarity_tier, achievement_code)
join public.achievements a on a.code = v.achievement_code
where not exists (
  select 1 from public.titles t where t.unlock_achievement_id = a.id
);
