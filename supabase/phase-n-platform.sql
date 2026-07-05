-- Phase N: 站內通知偏好（可獨立於 Email 開關）
alter table public.profiles
  add column if not exists tip_notify_in_app boolean not null default true,
  add column if not exists forum_reply_notify_in_app boolean not null default true,
  add column if not exists follow_new_game_in_app boolean not null default true;

comment on column public.profiles.tip_notify_in_app is
  'In-app notification for creator tips';
comment on column public.profiles.forum_reply_notify_in_app is
  'In-app notification for forum replies';
comment on column public.profiles.follow_new_game_in_app is
  'In-app notification when followed creators release new games';
