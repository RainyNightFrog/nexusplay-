-- ============================================================
-- 防止使用者透過 supabase.auth.updateUser() 竄改 role 越權
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- ============================================================

create or replace function public.guard_auth_user_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  old_role text;
  new_role text;
  old_meta jsonb;
  new_meta jsonb;
begin
  -- service role / 後台腳本可自由更新
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  old_meta := coalesce(old.raw_user_meta_data, '{}'::jsonb);
  new_meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  old_role := coalesce(old_meta ->> 'role', '');
  new_role := coalesce(new_meta ->> 'role', '');

  -- 禁止 client 自行變更 role（含升級 admin / creator）
  if new_role is distinct from old_role then
    new_meta := (new_meta - 'role') || jsonb_build_object('role', old_role);
    new.raw_user_meta_data := new_meta;
  end if;

  -- 雙重保險：不允許 metadata 出現 admin（僅 service role 可設）
  if coalesce(new.raw_user_meta_data ->> 'role', '') = 'admin' then
    new_meta := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'role';
    if old_role <> '' and old_role <> 'admin' then
      new_meta := new_meta || jsonb_build_object('role', old_role);
    end if;
    new.raw_user_meta_data := new_meta;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_auth_user_metadata on auth.users;
create trigger guard_auth_user_metadata
  before update on auth.users
  for each row
  execute function public.guard_auth_user_metadata();

comment on function public.guard_auth_user_metadata() is
  'Blocks client-side role escalation via auth.updateUser user_metadata';
