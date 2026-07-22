-- ============================================================
-- RainyNightFrog 安全強化（2026-07）
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- ============================================================

-- ----------------------------------------------------------------
-- 1. profiles：阻擋 client 竄改敏感欄位 + 限制公開可讀欄位
-- ----------------------------------------------------------------

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

  return new;
end;
$$;

drop trigger if exists profiles_block_sensitive_update on public.profiles;
create trigger profiles_block_sensitive_update
  before update on public.profiles
  for each row
  execute function public.profiles_block_sensitive_update();

-- 僅允許 anon/authenticated 讀取公開欄位（敏感欄位僅 service role）
revoke all on table public.profiles from anon, authenticated;
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
  supporter_since,
  equipped_avatar_frame,
  equipped_name_color,
  equipped_chat_bubble,
  created_at
) on table public.profiles to anon, authenticated;

grant select, update (
  display_name,
  avatar_url,
  bio,
  support_email,
  equipped_title_id,
  username
) on table public.profiles to authenticated;

-- 使用者僅能讀取／更新自己的 profile 列
drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;

create policy "Users read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Public read profiles"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------------
-- 2. games：公開 SELECT 僅限已審批通過的 public 遊戲
-- ----------------------------------------------------------------

drop policy if exists "Public read games" on public.games;

create policy "Public read games"
  on public.games
  for select
  to anon, authenticated
  using (
    (
      publish_status = 'public'
      and status = 'approved'
    )
    or (auth.uid() is not null and auth.uid() = creator_id)
  );

-- ----------------------------------------------------------------
-- 3. admin 身分：優先讀 profiles.is_admin（若欄位存在）
-- ----------------------------------------------------------------

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Server-managed super admin flag; do not expose to client updates';

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles p
      where p.id = auth.uid()
    ),
    coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin'
  );
$$;

-- is_admin 僅 service role 可寫
create or replace function public.profiles_block_is_admin_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.is_admin is distinct from old.is_admin then
    raise exception 'cannot modify is_admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_is_admin_update on public.profiles;
create trigger profiles_block_is_admin_update
  before update on public.profiles
  for each row
  execute function public.profiles_block_is_admin_update();
