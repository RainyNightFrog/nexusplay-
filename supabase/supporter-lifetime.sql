-- 永久傳說支持者（$250+）：supporter_lifetime + 稱號 RainyNightFrog
-- 請在 Supabase Dashboard → SQL Editor 執行

alter table public.profiles
  add column if not exists supporter_lifetime boolean not null default false,
  add column if not exists supporter_lifetime_announced_at timestamptz;

comment on column public.profiles.supporter_lifetime is
  '一次性 $250+ 永久支持者；訂閱取消時不撤銷';
comment on column public.profiles.supporter_lifetime_announced_at is
  '世界頻道上線廣播節流時間戳';

create index if not exists profiles_supporter_lifetime_idx
  on public.profiles (supporter_lifetime)
  where supporter_lifetime = true;

insert into public.titles (name, css_class, rarity_tier, unlock_achievement_id)
select v.name, v.css_class, v.rarity_tier, null
from (
  values
    ('RainyNightFrog', 'title-rainynightfrog', 'legendary')
) as v(name, css_class, rarity_tier)
where not exists (
  select 1
  from public.titles t
  where t.name = v.name
);

-- 在既有敏感欄位保護函式中追加永久支持者欄位（保留其餘檢查）
create or replace function public.profiles_block_sensitive_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.creator_balance_usd is distinct from old.creator_balance_usd then
    raise exception 'cannot modify creator_balance_usd';
  end if;
  if new.stripe_connect_account_id is distinct from old.stripe_connect_account_id then
    raise exception 'cannot modify stripe_connect_account_id';
  end if;
  if new.stripe_account_id is distinct from old.stripe_account_id then
    raise exception 'cannot modify stripe_account_id';
  end if;
  if new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'cannot modify stripe_customer_id';
  end if;
  if new.payout_status is distinct from old.payout_status then
    raise exception 'cannot modify payout_status';
  end if;
  if new.payout_onboarded_at is distinct from old.payout_onboarded_at then
    raise exception 'cannot modify payout_onboarded_at';
  end if;
  if new.player_number is distinct from old.player_number then
    raise exception 'cannot modify player_number';
  end if;
  if new.is_supporter is distinct from old.is_supporter then
    raise exception 'cannot modify is_supporter';
  end if;
  if new.supporter_since is distinct from old.supporter_since then
    raise exception 'cannot modify supporter_since';
  end if;
  if new.supporter_badge is distinct from old.supporter_badge then
    raise exception 'cannot modify supporter_badge';
  end if;
  if new.supporter_lifetime is distinct from old.supporter_lifetime then
    raise exception 'cannot modify supporter_lifetime';
  end if;
  if new.supporter_lifetime_announced_at is distinct from old.supporter_lifetime_announced_at then
    raise exception 'cannot modify supporter_lifetime_announced_at';
  end if;
  if new.account_status is distinct from old.account_status then
    raise exception 'cannot modify account_status';
  end if;
  if new.suspended_until is distinct from old.suspended_until then
    raise exception 'cannot modify suspended_until';
  end if;
  if new.ban_reason is distinct from old.ban_reason then
    raise exception 'cannot modify ban_reason';
  end if;
  if new.chat_muted_until is distinct from old.chat_muted_until then
    raise exception 'cannot modify chat_muted_until';
  end if;
  if new.forum_posting_disabled is distinct from old.forum_posting_disabled then
    raise exception 'cannot modify forum_posting_disabled';
  end if;

  return new;
end;
$$;

grant select (
  id,
  display_name,
  avatar_url,
  role,
  player_number,
  username,
  equipped_title_id,
  bio,
  support_email,
  is_supporter,
  supporter_badge,
  supporter_lifetime,
  created_at
) on table public.profiles to anon, authenticated;
