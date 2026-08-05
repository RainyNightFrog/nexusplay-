-- =============================================================================
-- Poker quests v2：加難每日任務 + 每週任務
-- 可重複執行；由 npm run db:poker-quests 或併入 db:poker
-- =============================================================================

-- 加難既有每日任務
UPDATE poker_quests SET
  target_value = 40,
  reward_points = 5500,
  title_key = 'poker.quest.playHands.title',
  description_key = 'poker.quest.playHands.desc',
  is_daily = true,
  active = true
WHERE slug = 'play-20-hands';

UPDATE poker_quests SET
  target_value = 3,
  reward_points = 4500,
  title_key = 'poker.quest.winPair.title',
  description_key = 'poker.quest.winPair.desc',
  is_daily = true,
  active = true
WHERE slug = 'win-pair-or-better';

UPDATE poker_quests SET
  target_value = 15,
  reward_points = 2800,
  title_key = 'poker.quest.foldPreflop.title',
  description_key = 'poker.quest.foldPreflop.desc',
  is_daily = true,
  active = true
WHERE slug = 'fold-preflop-5';

UPDATE poker_quests SET
  target_value = 8,
  reward_points = 7000,
  title_key = 'poker.quest.winPots.title',
  description_key = 'poker.quest.winPots.desc',
  is_daily = true,
  active = true
WHERE slug = 'win-3-pots';

-- 新增每日任務
INSERT INTO poker_quests (slug, kind, target_value, reward_points, title_key, description_key, is_daily, active)
VALUES
  ('daily-all-in-3', 'ALL_IN_COUNT', 3, 4000, 'poker.quest.allInDaily.title', 'poker.quest.allInDaily.desc', true, true),
  ('daily-play-60', 'PLAY_HANDS', 60, 8500, 'poker.quest.playHandsHard.title', 'poker.quest.playHandsHard.desc', true, true),
  ('daily-win-pots-12', 'WIN_POTS', 12, 10000, 'poker.quest.winPotsHard.title', 'poker.quest.winPotsHard.desc', true, true)
ON CONFLICT (slug) DO UPDATE SET
  kind = EXCLUDED.kind,
  target_value = EXCLUDED.target_value,
  reward_points = EXCLUDED.reward_points,
  title_key = EXCLUDED.title_key,
  description_key = EXCLUDED.description_key,
  is_daily = EXCLUDED.is_daily,
  active = true;

-- 每週任務（is_daily = false；進度以該週一為 period）
-- 難度再拉高：需較長時間投入才拿得到積分
INSERT INTO poker_quests (slug, kind, target_value, reward_points, title_key, description_key, is_daily, active)
VALUES
  ('week-play-150', 'PLAY_HANDS', 400, 42000, 'poker.quest.weekPlay.title', 'poker.quest.weekPlay.desc', false, true),
  ('week-win-20-pots', 'WIN_POTS', 55, 52000, 'poker.quest.weekWinPots.title', 'poker.quest.weekWinPots.desc', false, true),
  ('week-all-in-8', 'ALL_IN_COUNT', 25, 28000, 'poker.quest.weekAllIn.title', 'poker.quest.weekAllIn.desc', false, true),
  ('week-win-pair-10', 'WIN_HAND_PAIR_OR_BETTER', 28, 36000, 'poker.quest.weekWinPair.title', 'poker.quest.weekWinPair.desc', false, true),
  ('week-fold-30', 'FOLD_PREFLOP', 90, 22000, 'poker.quest.weekFold.title', 'poker.quest.weekFold.desc', false, true),
  ('week-play-250', 'PLAY_HANDS', 650, 70000, 'poker.quest.weekPlayElite.title', 'poker.quest.weekPlayElite.desc', false, true)
ON CONFLICT (slug) DO UPDATE SET
  kind = EXCLUDED.kind,
  target_value = EXCLUDED.target_value,
  reward_points = EXCLUDED.reward_points,
  title_key = EXCLUDED.title_key,
  description_key = EXCLUDED.description_key,
  is_daily = false,
  active = true;
