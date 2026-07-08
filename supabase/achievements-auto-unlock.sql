-- ============================================================
-- NexusPlay 成就自動解鎖擴充
-- 請在 achievements-titles.sql 之後執行
-- 或執行：npm run db:achievements-auto-unlock
-- ============================================================

-- 夜貓子玩家：凌晨 2:00–5:00（香港時間）累計上線秒數
alter table public.user_activity_stats
  add column if not exists night_online_time int not null default 0
    check (night_online_time >= 0);

-- 安全授予成就（冪等，解鎖時自動觸發稱號授予 Trigger）
create or replace function public.grant_achievement(
  p_user_id uuid,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement_id uuid;
  v_granted boolean := false;
begin
  if p_user_id is null or p_code is null or trim(p_code) = '' then
    return false;
  end if;

  select id into v_achievement_id
  from public.achievements
  where code = trim(p_code);

  if v_achievement_id is null then
    return false;
  end if;

  with inserted as (
    insert into public.user_achievements (user_id, achievement_id)
    values (p_user_id, v_achievement_id)
    on conflict (user_id, achievement_id) do nothing
    returning 1
  )
  select exists (select 1 from inserted) into v_granted;

  return v_granted;
end;
$$;

revoke all on function public.grant_achievement(uuid, text) from public;
grant execute on function public.grant_achievement(uuid, text) to service_role;

-- 脈衝更新：累加夜間上線時數（香港時間 02:00–04:59）
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
  v_night int := 0;
  v_hk_hour int;
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

  v_hk_hour := extract(
    hour from timezone('Asia/Hong_Kong', now())
  )::int;

  if v_hk_hour >= 2 and v_hk_hour < 5 and v_online > 0 then
    v_night := v_online;
  end if;

  insert into public.user_activity_stats (
    user_id,
    total_online_time,
    total_play_time,
    night_online_time,
    last_active_at
  )
  values (v_user_id, v_online, v_play, v_night, now())
  on conflict (user_id) do update set
    total_online_time = user_activity_stats.total_online_time + excluded.total_online_time,
    total_play_time = user_activity_stats.total_play_time + excluded.total_play_time,
    night_online_time = user_activity_stats.night_online_time + excluded.night_online_time,
    last_active_at = now();

  -- 夜貓子：累計達 10 小時自動解鎖
  if (
    select night_online_time
    from public.user_activity_stats
    where user_id = v_user_id
  ) >= 36000 then
    perform public.grant_achievement(v_user_id, 'night_owl');
  end if;
end;
$$;

revoke all on function public.pulse_user_activity(int, int) from public;
grant execute on function public.pulse_user_activity(int, int) to authenticated;

-- 打賞累加後檢查「打賞大戶」（HK$100）
create or replace function public.record_user_donation(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
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

  select total_donated into v_total
  from public.user_activity_stats
  where user_id = p_user_id;

  if coalesce(v_total, 0) >= 100 then
    perform public.grant_achievement(p_user_id, 'big_tipper');
  end if;
end;
$$;

revoke all on function public.record_user_donation(uuid, numeric) from public;
grant execute on function public.record_user_donation(uuid, numeric) to service_role;
