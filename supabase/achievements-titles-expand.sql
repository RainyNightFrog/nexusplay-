-- ============================================================
-- RainyNightFrog 稱號擴充：為其餘成就補齊可佩戴稱號
-- 請在 achievements-expand.sql 之後執行
-- 或執行：npm run db:achievements-titles-expand
-- ============================================================

insert into public.titles (name, css_class, rarity_tier, unlock_achievement_id)
select v.name, v.css_class, v.rarity_tier, a.id
from (
  values
    ('江湖新秀', 'title-tier-common', 'common', 'playtime_1h'),
    ('沉浸冒險家', 'title-tier-rare', 'rare', 'playtime_10h'),
    ('百遊行者', 'title-tier-rare', 'rare', 'games_played_5'),
    ('競技新秀', 'title-tier-common', 'common', 'leaderboard_submit'),
    ('初評者', 'title-tier-common', 'common', 'first_comment'),
    ('論壇新秀', 'title-tier-rare', 'rare', 'forum_debut'),
    ('話癆達人', 'title-tier-common', 'common', 'chat_regular'),
    ('珍藏家', 'title-tier-rare', 'rare', 'favorites_5'),
    ('人氣新星', 'title-tier-rare', 'rare', 'creator_first_tip'),
    ('社群之聲', 'title-tier-rare', 'rare', 'creator_community'),
    ('常駐玩家', 'title-tier-rare', 'rare', 'online_10h'),
    ('資深老兵', 'title-tier-epic', 'epic', 'veteran_30d'),
    ('完美形象', 'title-tier-common', 'common', 'profile_complete'),
    ('暖心支持', 'title-tier-common', 'common', 'donation_starter')
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
