-- ============================================================
-- 遊戲排行榜（game_leaderboard）— 基礎表（相容舊版）
-- 請在 Supabase Dashboard → SQL Editor 中執行，或 npm run db:leaderboard
-- 完整 schema（含 difficulty 分榜）會由 game-leaderboard-by-difficulty.sql 補上
-- ============================================================

create table if not exists public.game_leaderboard (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  score bigint not null default 0,
  grade text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_leaderboard_game_user_unique unique (game_id, user_id)
);

create index if not exists game_leaderboard_game_score_idx
  on public.game_leaderboard (game_id, score desc);

comment on table public.game_leaderboard is
  'RainyNightFrog 平台遊戲排行榜：每位玩家每款遊戲保留最高分';

alter table public.game_leaderboard enable row level security;

drop policy if exists "Public read game leaderboard" on public.game_leaderboard;
drop policy if exists "Players insert own leaderboard" on public.game_leaderboard;
drop policy if exists "Players update own leaderboard" on public.game_leaderboard;

create policy "Public read game leaderboard"
  on public.game_leaderboard
  for select
  using (true);

create policy "Players insert own leaderboard"
  on public.game_leaderboard
  for insert
  with check (auth.uid() = user_id);

create policy "Players update own leaderboard"
  on public.game_leaderboard
  for update
  using (auth.uid() = user_id);
