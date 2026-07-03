-- 為 games 表新增排序用欄位（plays_count、rating_avg）
-- 請在 Supabase Dashboard → SQL Editor 中執行

alter table public.games
  add column if not exists plays_count bigint not null default 0,
  add column if not exists rating_avg numeric(3, 2) not null default 0;

create index if not exists games_plays_count_idx on public.games (plays_count desc);
create index if not exists games_rating_avg_idx on public.games (rating_avg desc);
create index if not exists games_category_idx on public.games (category);
