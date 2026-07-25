-- 修正 is_admin()：不可再 fallback 到可偽造的 user_metadata.role
-- 僅信任 profiles.is_admin，或 JWT app_metadata.role = admin（僅 service 可寫）
-- 請在 Supabase SQL Editor 執行

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
    false
  )
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

comment on function public.is_admin() is
  'True when profiles.is_admin or app_metadata.role=admin. Never trusts user_metadata.';
