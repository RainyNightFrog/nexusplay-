-- ============================================================
-- NexusPlay 全站玩家活躍度統計（實時排行榜用）
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- 或執行：npm run db:activity-stats
-- ============================================================

create table if not exists public.user_activity_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_online_time int not null default 0 check (total_online_time >= 0),
  total_play_time int not null default 0 check (total_play_time >= 0),
  total_donated numeric(12, 2) not null default 0 check (total_donated >= 0),
  last_active_at timestamptz not null default now()
);

create index if not exists user_activity_stats_online_idx
  on public.user_activity_stats (total_online_time desc);

create index if not exists user_activity_stats_play_idx
  on public.user_activity_stats (total_play_time desc);

create index if not exists user_activity_stats_donated_idx
  on public.user_activity_stats (total_donated desc);

create index if not exists user_activity_stats_last_active_idx
  on public.user_activity_stats (last_active_at desc);

-- 為既有玩家補建統計列
insert into public.user_activity_stats (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- 可重複呼叫：為尚未有統計列的玩家補建（API 自我修復用）
create or replace function public.backfill_user_activity_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_activity_stats (user_id)
  select id from public.profiles
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.backfill_user_activity_stats() from public;
grant execute on function public.backfill_user_activity_stats() to anon, authenticated, service_role;

-- 新註冊玩家自動建立統計列
create or replace function public.handle_new_user_activity_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_activity_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_activity_stats on auth.users;
create trigger on_auth_user_created_activity_stats
  after insert on auth.users
  for each row
  execute function public.handle_new_user_activity_stats();

-- ============================================================
-- RLS
-- ============================================================

alter table public.user_activity_stats enable row level security;

drop policy if exists "Public read activity stats" on public.user_activity_stats;
create policy "Public read activity stats"
  on public.user_activity_stats
  for select
  using (true);

-- ============================================================
-- 安全脈衝更新：前端定時累加在線 / 遊玩時長（僅限已登入玩家）
-- ============================================================

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

  insert into public.user_activity_stats (
    user_id,
    total_online_time,
    total_play_time,
    last_active_at
  )
  values (v_user_id, v_online, v_play, now())
  on conflict (user_id) do update set
    total_online_time = user_activity_stats.total_online_time + excluded.total_online_time,
    total_play_time = user_activity_stats.total_play_time + excluded.total_play_time,
    last_active_at = now();
end;
$$;

revoke all on function public.pulse_user_activity(int, int) from public;
grant execute on function public.pulse_user_activity(int, int) to authenticated;

-- ============================================================
-- 打賞累加（供未來隨喜 API 透過 service role 呼叫）
-- ============================================================

create or replace function public.record_user_donation(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
end;
$$;

revoke all on function public.record_user_donation(uuid, numeric) from public;
