-- ============================================================
-- profiles：補齊普通玩家應可讀的公開欄位（外觀／supporter_since）
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- 對齊 security-hardening-2026.sql 的 SELECT grant
-- ============================================================

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

-- 確認一般使用者仍只能更新這些欄位（不含 role / is_admin / 金流）
grant update (
  display_name,
  avatar_url,
  bio,
  support_email,
  equipped_title_id,
  username
) on table public.profiles to authenticated;
