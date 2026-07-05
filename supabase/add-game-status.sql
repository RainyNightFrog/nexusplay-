-- ============================================================
-- games 表：新增管理員審批 status 欄位
-- 請在 Supabase Dashboard → SQL Editor 中「整段」執行
-- 或在本機執行：npm run db:status
-- ============================================================

-- 1. 新增審批狀態欄位（預設 pending）
alter table public.games
  add column if not exists status text not null default 'pending';

-- 2. 既有已公開遊戲視為已審批通過，避免首頁空白
update public.games
set status = 'approved'
where publish_status = 'public'
  and status = 'pending';

-- 3. 審批狀態約束
alter table public.games
  drop constraint if exists games_status_check;

alter table public.games
  add constraint games_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- 4. 查詢索引
create index if not exists games_status_idx
  on public.games (status);

comment on column public.games.status is
  '管理員審批狀態：pending（待審）、approved（通過）、rejected（退回）';

-- 5. 強化創作者更新政策：僅能改自己的遊戲，且不可自行核准（approved）
drop policy if exists "Creators update own games" on public.games;

create policy "Creators update own games"
  on public.games
  for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (
    auth.uid() = creator_id
    and (
      status = (
        select g.status
        from public.games as g
        where g.id = games.id
      )
      or status = 'pending'
    )
    and not (
      status = 'approved'
      and status is distinct from (
        select g.status
        from public.games as g
        where g.id = games.id
      )
    )
  );
