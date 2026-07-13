-- ============================================================
-- 遊戲排行榜：依難度分榜（migration）
-- 在既有 game_leaderboard 表上執行；新環境請直接用 game-leaderboard.sql
-- ============================================================

alter table public.game_leaderboard
  add column if not exists difficulty text;

update public.game_leaderboard
set difficulty = coalesce(nullif(trim(meta->>'difficulty'), ''), 'normal')
where difficulty is null;

alter table public.game_leaderboard
  alter column difficulty set default 'normal';

alter table public.game_leaderboard
  alter column difficulty set not null;

alter table public.game_leaderboard
  drop constraint if exists game_leaderboard_game_user_unique;

alter table public.game_leaderboard
  drop constraint if exists game_leaderboard_game_user_diff_unique;

alter table public.game_leaderboard
  add constraint game_leaderboard_game_user_diff_unique
  unique (game_id, user_id, difficulty);

create index if not exists game_leaderboard_game_diff_score_idx
  on public.game_leaderboard (game_id, difficulty, score desc);

drop index if exists public.game_leaderboard_game_score_idx;

comment on table public.game_leaderboard is
  'RainyNightFrog 平台遊戲排行榜：每位玩家每款遊戲、每個難度各保留最高分';

comment on column public.game_leaderboard.difficulty is
  '遊戲難度分榜鍵（對應 SDK meta.difficulty，例如 easy / normal / hard / extreme / versus）';
