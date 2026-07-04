-- 遊戲發布狀態（Draft / Public）與隨喜打賞設定
-- 請在 Supabase Dashboard → SQL Editor 中執行，或 npm run db:publish

alter table public.games
  add column if not exists publish_status text not null default 'public',
  add column if not exists tips_enabled boolean not null default false,
  add column if not exists suggested_tip_amount numeric(10, 2);

alter table public.games
  drop constraint if exists games_publish_status_check;

alter table public.games
  add constraint games_publish_status_check
  check (publish_status in ('draft', 'public'));

-- 既有資料維持公開，避免首頁突然空白
update public.games
set publish_status = 'public'
where publish_status is null or publish_status = '';

create index if not exists games_publish_status_idx
  on public.games (publish_status);

-- 公開列表僅顯示 Public；創作者可讀取自己的 Draft
drop policy if exists "Public read games" on public.games;

create policy "Public read games"
  on public.games
  for select
  to anon, authenticated
  using (
    publish_status = 'public'
    or (auth.uid() is not null and auth.uid() = creator_id)
  );
