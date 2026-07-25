-- 原子調整創作者帳本餘額（service role / 後端 RPC）
-- 請在 Supabase SQL Editor 執行

create or replace function public.adjust_creator_balance_usd(
  p_user_id uuid,
  p_delta numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance numeric;
begin
  if p_user_id is null then
    raise exception 'p_user_id required';
  end if;

  update public.profiles
  set creator_balance_usd = greatest(
    0,
    round(coalesce(creator_balance_usd, 0) + coalesce(p_delta, 0), 2)
  )
  where id = p_user_id
  returning creator_balance_usd into next_balance;

  if not found then
    raise exception 'profile not found';
  end if;

  return next_balance;
end;
$$;

revoke all on function public.adjust_creator_balance_usd(uuid, numeric) from public;
grant execute on function public.adjust_creator_balance_usd(uuid, numeric) to service_role;

comment on function public.adjust_creator_balance_usd(uuid, numeric) is
  'Atomically adjust creator_balance_usd; floor at 0. Service role only.';
