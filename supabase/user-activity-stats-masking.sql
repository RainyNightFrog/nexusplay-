-- ============================================================
-- user_activity_stats 打賞金額脫敏（公開 View + RLS 強化）
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- ============================================================

-- 打賞區間標籤（公開顯示用，不含精確金額）
create or replace function public.donation_privacy_tier(p_amount numeric)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_amount, 0) <= 0 then 'none'
    when p_amount < 50 then 'supporter'
    when p_amount < 200 then 'enthusiast'
    when p_amount < 1000 then 'patron'
    else 'legend'
  end;
$$;

comment on function public.donation_privacy_tier(numeric) is
  'Public donation bucket key: none | supporter | enthusiast | patron | legend';

-- 公開排行榜／他人資料用 View（不含精確 total_donated）
create or replace view public.user_activity_stats_public
with (security_invoker = true)
as
select
  user_id,
  total_online_time,
  total_play_time,
  public.donation_privacy_tier(total_donated) as donation_tier,
  last_active_at
from public.user_activity_stats;

comment on view public.user_activity_stats_public is
  'Masked activity stats for public leaderboard; exact donations only via service role or own row policy';

grant select on public.user_activity_stats_public to anon, authenticated;

-- 移除全表公開讀取，改為分級政策
drop policy if exists "Public read activity stats" on public.user_activity_stats;

drop policy if exists "Users read own activity stats" on public.user_activity_stats;
create policy "Users read own activity stats"
  on public.user_activity_stats
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins read all activity stats" on public.user_activity_stats;
create policy "Admins read all activity stats"
  on public.user_activity_stats
  for select
  to authenticated
  using (public.is_admin());

-- service role 仍可直接讀寫原表（API 層再做脫敏）
