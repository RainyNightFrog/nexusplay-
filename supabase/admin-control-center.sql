-- ============================================================
-- RainyNightFrog 超級管理員控制中心 — 資料庫擴充腳本
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- ============================================================

-- ----------------------------------------------------------------
-- 0. 共用：判斷 JWT user_metadata 是否為 admin
--    （RLS 無法直接查 auth.users，故透過 auth.jwt() 讀取）
-- ----------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin';
$$;

-- ================================================================
-- 1. 🎮 擴充 games 表：新增審批狀態欄位
-- ================================================================

alter table public.games
  add column if not exists status text not null default 'pending';

-- 既有已公開的遊戲視為已審批通過，避免上線後首頁空白
update public.games
set status = 'approved'
where publish_status = 'public'
  and status = 'pending';

alter table public.games
  drop constraint if exists games_status_check;

alter table public.games
  add constraint games_status_check
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists games_status_idx
  on public.games (status);

comment on column public.games.status is
  '管理員審批狀態：pending（待審）、approved（通過）、rejected（退回）';

-- 強化創作者更新政策：不可自行核准
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

-- ================================================================
-- 2. 📩 建立 player_feedbacks 表
-- ================================================================

create table if not exists public.player_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  subject text not null,
  message text not null,
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  constraint player_feedbacks_subject_not_blank check (trim(subject) <> ''),
  constraint player_feedbacks_message_not_blank check (trim(message) <> ''),
  constraint player_feedbacks_status_check check (status in ('unread', 'resolved'))
);

create index if not exists player_feedbacks_status_idx
  on public.player_feedbacks (status);

create index if not exists player_feedbacks_created_at_idx
  on public.player_feedbacks (created_at desc);

create index if not exists player_feedbacks_user_id_idx
  on public.player_feedbacks (user_id);

comment on table public.player_feedbacks is
  '玩家反饋與 Bug 回報；遊客與登入玩家皆可提交';

-- ================================================================
-- 3. 📜 建立 admin_logs 表
-- ================================================================

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  details text,
  created_at timestamptz not null default now(),
  constraint admin_logs_action_not_blank check (trim(action) <> '')
);

create index if not exists admin_logs_admin_id_idx
  on public.admin_logs (admin_id);

create index if not exists admin_logs_created_at_idx
  on public.admin_logs (created_at desc);

create index if not exists admin_logs_action_idx
  on public.admin_logs (action);

comment on table public.admin_logs is
  '管理員操作稽核日誌，例如 approve_game、ban_user';

-- ================================================================
-- 4. 🛡️ Row Level Security 與 Policies
-- ================================================================

-- ----------------------------------------------------------------
-- 4a. player_feedbacks
-- ----------------------------------------------------------------
alter table public.player_feedbacks enable row level security;

drop policy if exists "Anyone can submit feedback" on public.player_feedbacks;
drop policy if exists "Admins read feedbacks" on public.player_feedbacks;
drop policy if exists "Admins update feedbacks" on public.player_feedbacks;

-- 所有人（含 anon 遊客）可提交反饋
create policy "Anyone can submit feedback"
  on public.player_feedbacks
  for insert
  to anon, authenticated
  with check (
    trim(subject) <> ''
    and trim(message) <> ''
    and status = 'unread'
    and (
      user_id is null
      or user_id = auth.uid()
    )
  );

-- 僅 admin 可讀取
create policy "Admins read feedbacks"
  on public.player_feedbacks
  for select
  to authenticated
  using (public.is_admin());

-- 僅 admin 可更新（例如標記為 resolved）
create policy "Admins update feedbacks"
  on public.player_feedbacks
  for update
  to authenticated
  using (public.is_admin())
  with check (
    public.is_admin()
    and status in ('unread', 'resolved')
  );

-- ----------------------------------------------------------------
-- 4b. admin_logs
-- ----------------------------------------------------------------
alter table public.admin_logs enable row level security;

drop policy if exists "Admins read admin logs" on public.admin_logs;
drop policy if exists "Admins insert admin logs" on public.admin_logs;

-- 僅 admin 可讀取
create policy "Admins read admin logs"
  on public.admin_logs
  for select
  to authenticated
  using (public.is_admin());

-- 僅 admin 可寫入（且 admin_id 必須為本人）
create policy "Admins insert admin logs"
  on public.admin_logs
  for insert
  to authenticated
  with check (
    public.is_admin()
    and admin_id = auth.uid()
    and trim(action) <> ''
  );

-- ================================================================
-- 完成提示（可選：執行後在 Results 面板確認）
-- ================================================================
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('games', 'player_feedbacks', 'admin_logs')
-- order by table_name, ordinal_position;
