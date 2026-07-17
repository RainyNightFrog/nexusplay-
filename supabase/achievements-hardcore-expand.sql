-- ============================================================
-- RainyNightFrog 成就／稱號強化：修正對齊 + 高難度特別成就
-- 請在 achievements-titles-expand.sql 之後執行
-- 或執行：npm run db:achievements-hardcore
-- ============================================================

-- ------------------------------------------------------------
-- 調整既有成就（文案、稀有度、難度微調）
-- ------------------------------------------------------------
update public.achievements set
  title = '全站首勝',
  description = '在排行榜達成第一次勝利判定（通關／獲勝等級），踏上冒險之路。',
  rarity_tier = 'rare',
  points = 50,
  progress_target = 1
where code = 'first_win';

update public.achievements set
  title = '打賞大戶',
  description = '累計打賞達 HK$100，用行動支持喜愛的創作者。',
  rarity_tier = 'epic',
  points = 100,
  progress_target = 100
where code = 'big_tipper';

update public.achievements set
  title = '創作者首發',
  description = '發布你的第一款公開遊戲，正式加入創作者行列。',
  rarity_tier = 'epic',
  points = 80,
  progress_target = 1
where code = 'creator_debut';

update public.achievements set
  title = '夜貓子玩家',
  description = '在凌晨 2:00–5:00（香港時間）累計上線達 10 小時，黑夜是你的戰場。',
  rarity_tier = 'legendary',
  points = 150,
  progress_target = 36000
where code = 'night_owl';

update public.achievements set
  description = '累計遊玩達 50 小時，真正的硬核玩家。',
  rarity_tier = 'legendary',
  points = 150,
  progress_target = 180000
where code = 'playtime_50h';

update public.achievements set
  title = '勝場收集者',
  description = '在排行榜累計達成 5 次勝利判定（通關／獲勝等級）。',
  rarity_tier = 'epic',
  points = 85,
  progress_target = 5
where code = 'win_collector';

update public.achievements set
  title = '聊天室常客',
  description = '在聊天室累計發言 50 次，社群因你而熱鬧。',
  rarity_tier = 'rare',
  points = 35,
  progress_target = 50
where code = 'chat_regular';

update public.achievements set
  title = '社交流浪者',
  description = '評論、論壇與聊天累計互動達 50 次。',
  rarity_tier = 'epic',
  points = 80,
  progress_target = 50
where code = 'social_butterfly';

update public.achievements set
  title = '完美檔案',
  description = '填寫顯示名稱，並加上頭像、個人簡介或支援信箱其中一項。',
  rarity_tier = 'common',
  points = 20,
  progress_target = 1
where code = 'profile_complete';

update public.achievements set
  description = '體驗 5 款不同遊戲並留下排行榜紀錄，展現探索精神。',
  rarity_tier = 'rare',
  points = 40,
  progress_target = 5
where code = 'games_played_5';

-- ------------------------------------------------------------
-- 對齊既有稱號稀有度（名稱不變，只調稀有度／樣式）
-- ------------------------------------------------------------
update public.titles t
set
  css_class = 'title-tier-rare',
  rarity_tier = 'rare'
from public.achievements a
where t.unlock_achievement_id = a.id and a.code = 'first_win';

update public.titles t
set
  css_class = 'title-tier-epic',
  rarity_tier = 'epic'
from public.achievements a
where t.unlock_achievement_id = a.id and a.code = 'big_tipper';

update public.titles t
set
  css_class = 'title-tier-epic',
  rarity_tier = 'epic'
from public.achievements a
where t.unlock_achievement_id = a.id and a.code = 'creator_debut';

update public.titles t
set
  css_class = 'title-tier-rare',
  rarity_tier = 'rare'
from public.achievements a
where t.unlock_achievement_id = a.id and a.code = 'chat_regular';

-- ------------------------------------------------------------
-- 新增高難度成就
-- ------------------------------------------------------------
insert into public.achievements (code, title, description, badge_icon, category, rarity_tier, points, progress_target)
values
  -- 遊玩／競技
  ('win_master', '百戰猛將', '在排行榜累計達成 25 次勝利判定，實力深不可測。', '⚔️', 'gameplay', 'epic', 140, 25),
  ('win_legend', '常勝將軍', '在排行榜累計達成 100 次勝利判定，傳說級戰績。', '🏅', 'gameplay', 'legendary', 250, 100),
  ('s_rank_clear', '完美主義者', '在任一遊戲排行榜留下 S 級（或以上）成績。', '💎', 'gameplay', 'epic', 120, 1),
  ('playtime_100h', '時間吞噬者', '累計遊玩達 100 小時，時間對你毫無意義。', '⏳', 'gameplay', 'legendary', 220, 360000),
  ('games_played_15', '萬遊旅人', '體驗 15 款不同遊戲並留下排行榜紀錄。', '🗺️', 'gameplay', 'epic', 110, 15),
  ('games_played_30', '全境探索者', '體驗 30 款不同遊戲並留下排行榜紀錄，足跡遍佈平台。', '🌍', 'gameplay', 'legendary', 200, 30),
  ('cloud_save_1', '雲端旅人', '首次使用雲端存檔，進度永不丟失。', '☁️', 'gameplay', 'common', 15, 1),
  ('cloud_save_5', '存檔收藏家', '在 5 款不同遊戲留下雲端存檔。', '💾', 'gameplay', 'rare', 45, 5),
  ('leaderboard_10', '競技常客', '累計提交排行榜成績達 10 次。', '📈', 'gameplay', 'rare', 50, 10),
  ('leaderboard_50', '榜單狂熱者', '累計提交排行榜成績達 50 次。', '🏁', 'gameplay', 'epic', 130, 50),

  -- 上線／資深
  ('online_50h', '常駐元老', '累計上線達 50 小時，RainyNightFrog 幾乎是你的第二個家。', '🏠', 'special', 'epic', 120, 180000),
  ('online_100h', '永遠在線', '累計上線達 100 小時，螢幕前的身影從未消失。', '📡', 'special', 'legendary', 200, 360000),
  ('night_owl_50h', '永恆暗夜', '凌晨 2:00–5:00 累計上線達 50 小時，暗夜之主。', '🖤', 'special', 'legendary', 280, 180000),
  ('veteran_90d', '季度元老', '加入 RainyNightFrog 滿 90 天。', '🛡️', 'special', 'epic', 130, 90),
  ('veteran_365d', '一年之約', '加入滿 365 天，與平台共度一整年。', '👑', 'special', 'legendary', 300, 365),

  -- 社交
  ('chat_veteran', '聊天室之魂', '在聊天室累計發言 200 次。', '📢', 'social', 'epic', 110, 200),
  ('chat_legend', '話術傳奇', '在聊天室累計發言 1000 次，社群離不開你。', '🎙️', 'social', 'legendary', 240, 1000),
  ('forum_regular', '論壇元老', '在社群論壇累計發表 10 篇貼文。', '📰', 'social', 'epic', 100, 10),
  ('forum_replies_50', '回覆大師', '在論壇累計回覆 50 則留言。', '💭', 'social', 'epic', 100, 50),
  ('comments_25', '銳評家', '累計發表 25 則遊戲評論。', '🖊️', 'social', 'epic', 95, 25),
  ('social_legend', '社交帝王', '評論、論壇與聊天累計互動達 300 次。', '🌟', 'social', 'legendary', 220, 300),
  ('favorites_20', '收藏大師', '收藏 20 款喜愛的遊戲。', '💝', 'social', 'epic', 90, 20),
  ('follows_5', '伯樂識才', '追蹤 5 位創作者，支持你看好的人才。', '👀', 'social', 'rare', 40, 5),
  ('follows_20', '星探', '追蹤 20 位創作者。', '🔭', 'social', 'epic', 100, 20),

  -- 打賞／消費
  ('big_tipper_500', '金主降臨', '累計打賞達 HK$500，創作者的守護神。', '🤑', 'social', 'legendary', 250, 500),
  ('tip_creators_5', '廣結善緣', '向 5 位不同創作者完成打賞。', '🤝', 'social', 'epic', 130, 5),
  ('tip_creators_15', '贊助天使', '向 15 位不同創作者完成打賞。', '👼', 'social', 'legendary', 260, 15),
  ('first_purchase', '付費玩家', '購買第一款付費遊戲，用真金白銀支持創作。', '🛒', 'social', 'rare', 55, 1),
  ('patron_3', '資深買家', '擁有 3 款付費遊戲授權。', '📦', 'social', 'epic', 120, 3),
  ('patron_10', '圖書館館長', '擁有 10 款付費遊戲授權，私人遊戲庫成形。', '📚', 'social', 'legendary', 220, 10),

  -- 創作者
  ('creator_5_games', '工作室主理人', '發布 5 款公開遊戲，已成創作工作室規模。', '🏢', 'creator', 'legendary', 250, 5),
  ('creator_tips_10', '金流不斷', '累計收到 10 筆玩家打賞。', '💵', 'creator', 'epic', 130, 10),
  ('creator_tips_50', '打賞磁鐵', '累計收到 50 筆玩家打賞。', '🧲', 'creator', 'legendary', 240, 50),
  ('creator_comments_50', '口碑製造機', '作品累計收到 50 則玩家評論。', '🗣️', 'creator', 'epic', 120, 50),
  ('creator_plays_1k', '破千人氣', '你的公開作品累計遊玩次數達 1,000。', '🔥', 'creator', 'epic', 140, 1000),
  ('creator_plays_10k', '萬人焦點', '你的公開作品累計遊玩次數達 10,000。', '💥', 'creator', 'legendary', 280, 10000),
  ('followed_10', '人氣創作者', '累計獲得 10 位追蹤者。', '⭐', 'creator', 'epic', 110, 10),
  ('followed_50', '明星創作者', '累計獲得 50 位追蹤者，粉絲團成形。', '🌠', 'creator', 'legendary', 250, 50)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  badge_icon = excluded.badge_icon,
  category = excluded.category,
  rarity_tier = excluded.rarity_tier,
  points = excluded.points,
  progress_target = excluded.progress_target;

-- ------------------------------------------------------------
-- 新增特別稱號（對應新成就）
-- ------------------------------------------------------------
insert into public.titles (name, css_class, rarity_tier, unlock_achievement_id)
select v.name, v.css_class, v.rarity_tier, a.id
from (
  values
    ('百戰猛將', 'title-tier-epic', 'epic', 'win_master'),
    ('常勝將軍', 'title-special-immortal', 'legendary', 'win_legend'),
    ('完美主義者', 'title-tier-epic', 'epic', 's_rank_clear'),
    ('時間吞噬者', 'title-special-void', 'legendary', 'playtime_100h'),
    ('萬遊旅人', 'title-tier-epic', 'epic', 'games_played_15'),
    ('全境探索者', 'title-tier-legendary', 'legendary', 'games_played_30'),
    ('雲端旅人', 'title-tier-common', 'common', 'cloud_save_1'),
    ('存檔收藏家', 'title-tier-rare', 'rare', 'cloud_save_5'),
    ('競技常客', 'title-tier-rare', 'rare', 'leaderboard_10'),
    ('榜單狂熱者', 'title-tier-epic', 'epic', 'leaderboard_50'),
    ('常駐元老', 'title-tier-epic', 'epic', 'online_50h'),
    ('永遠在線', 'title-tier-legendary', 'legendary', 'online_100h'),
    ('永恆暗夜', 'title-special-void', 'legendary', 'night_owl_50h'),
    ('季度元老', 'title-tier-epic', 'epic', 'veteran_90d'),
    ('一年之約', 'title-special-immortal', 'legendary', 'veteran_365d'),
    ('聊天室之魂', 'title-tier-epic', 'epic', 'chat_veteran'),
    ('話術傳奇', 'title-tier-legendary', 'legendary', 'chat_legend'),
    ('論壇元老', 'title-tier-epic', 'epic', 'forum_regular'),
    ('回覆大師', 'title-tier-epic', 'epic', 'forum_replies_50'),
    ('銳評家', 'title-tier-epic', 'epic', 'comments_25'),
    ('社交帝王', 'title-tier-legendary', 'legendary', 'social_legend'),
    ('收藏大師', 'title-tier-epic', 'epic', 'favorites_20'),
    ('伯樂識才', 'title-tier-rare', 'rare', 'follows_5'),
    ('星探', 'title-tier-epic', 'epic', 'follows_20'),
    ('金主降臨', 'title-special-immortal', 'legendary', 'big_tipper_500'),
    ('廣結善緣', 'title-tier-epic', 'epic', 'tip_creators_5'),
    ('贊助天使', 'title-tier-legendary', 'legendary', 'tip_creators_15'),
    ('付費玩家', 'title-tier-rare', 'rare', 'first_purchase'),
    ('資深買家', 'title-tier-epic', 'epic', 'patron_3'),
    ('圖書館館長', 'title-tier-legendary', 'legendary', 'patron_10'),
    ('工作室主理人', 'title-special-void', 'legendary', 'creator_5_games'),
    ('金流不斷', 'title-tier-epic', 'epic', 'creator_tips_10'),
    ('打賞磁鐵', 'title-tier-legendary', 'legendary', 'creator_tips_50'),
    ('口碑製造機', 'title-tier-epic', 'epic', 'creator_comments_50'),
    ('破千人氣', 'title-tier-epic', 'epic', 'creator_plays_1k'),
    ('萬人焦點', 'title-special-immortal', 'legendary', 'creator_plays_10k'),
    ('人氣創作者', 'title-tier-epic', 'epic', 'followed_10'),
    ('明星創作者', 'title-tier-legendary', 'legendary', 'followed_50')
) as v(name, css_class, rarity_tier, achievement_code)
join public.achievements a on a.code = v.achievement_code
where not exists (
  select 1 from public.titles t where t.unlock_achievement_id = a.id
);

-- 為已解鎖成就但尚未領取稱號的使用者補發
insert into public.user_titles (user_id, title_id)
select ua.user_id, t.id
from public.user_achievements ua
join public.titles t on t.unlock_achievement_id = ua.achievement_id
on conflict (user_id, title_id) do nothing;

-- ------------------------------------------------------------
-- 打賞時同時自動授予「小小支持者」
-- ------------------------------------------------------------
create or replace function public.record_user_donation(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000 then
    raise exception 'Invalid donation amount';
  end if;

  insert into public.user_activity_stats (
    user_id,
    total_donated,
    last_active_at
  )
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update set
    total_donated = user_activity_stats.total_donated + excluded.total_donated,
    last_active_at = now();

  select total_donated into v_total
  from public.user_activity_stats
  where user_id = p_user_id;

  perform public.grant_achievement(p_user_id, 'donation_starter');

  if coalesce(v_total, 0) >= 100 then
    perform public.grant_achievement(p_user_id, 'big_tipper');
  end if;

  if coalesce(v_total, 0) >= 500 then
    perform public.grant_achievement(p_user_id, 'big_tipper_500');
  end if;
end;
$$;

revoke all on function public.record_user_donation(uuid, numeric) from public;
grant execute on function public.record_user_donation(uuid, numeric) to service_role;

-- 夜間時數達 50 小時自動授予「永恆暗夜」
create or replace function public.pulse_user_activity(
  p_online_seconds int default 0,
  p_play_seconds int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_online int;
  v_play int;
  v_night int := 0;
  v_hk_hour int;
  v_night_total int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_online := greatest(0, least(coalesce(p_online_seconds, 0), 60));
  v_play := greatest(0, least(coalesce(p_play_seconds, 0), 60));

  if v_play > v_online then
    v_play := v_online;
  end if;

  v_hk_hour := extract(
    hour from timezone('Asia/Hong_Kong', now())
  )::int;

  if v_hk_hour >= 2 and v_hk_hour < 5 and v_online > 0 then
    v_night := v_online;
  end if;

  insert into public.user_activity_stats (
    user_id,
    total_online_time,
    total_play_time,
    night_online_time,
    last_active_at
  )
  values (v_user_id, v_online, v_play, v_night, now())
  on conflict (user_id) do update set
    total_online_time = user_activity_stats.total_online_time + excluded.total_online_time,
    total_play_time = user_activity_stats.total_play_time + excluded.total_play_time,
    night_online_time = user_activity_stats.night_online_time + excluded.night_online_time,
    last_active_at = now();

  select night_online_time into v_night_total
  from public.user_activity_stats
  where user_id = v_user_id;

  if coalesce(v_night_total, 0) >= 36000 then
    perform public.grant_achievement(v_user_id, 'night_owl');
  end if;

  if coalesce(v_night_total, 0) >= 180000 then
    perform public.grant_achievement(v_user_id, 'night_owl_50h');
  end if;
end;
$$;

revoke all on function public.pulse_user_activity(int, int) from public;
grant execute on function public.pulse_user_activity(int, int) to authenticated;
