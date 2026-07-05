-- ============================================================
-- NexusPlay 人流統計 — analytics_events 表
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- 或執行：npm run db:analytics
-- ============================================================

create table if not exists public.analytics_events (
  id bigserial primary key,
  event_type text not null,
  path text,
  game_id bigint references public.games (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  session_id text not null,
  locale text,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_type_check
    check (event_type in ('page_view', 'game_play')),
  constraint analytics_events_session_not_blank
    check (trim(session_id) <> '')
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_game_id_idx
  on public.analytics_events (game_id, created_at desc)
  where game_id is not null;

create index if not exists analytics_events_session_id_idx
  on public.analytics_events (session_id);

comment on table public.analytics_events is
  '網站人流與遊戲遊玩事件；由 API 寫入，管理員可讀取統計';

-- 僅 service role / server 端寫入；RLS 禁止 anon 直接存取
alter table public.analytics_events enable row level security;

drop policy if exists "Admins read analytics events" on public.analytics_events;

create policy "Admins read analytics events"
  on public.analytics_events
  for select
  to authenticated
  using (public.is_admin());

-- 原子遞增遊玩次數（取代 read-modify-write）
create or replace function public.increment_game_plays(p_game_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.games
  set plays_count = coalesce(plays_count, 0) + 1
  where id = p_game_id;
$$;
