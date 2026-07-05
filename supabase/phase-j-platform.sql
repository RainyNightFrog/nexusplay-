-- Phase J: 通知偏好（創作者打賞 Email、論壇回覆 Email）
alter table public.profiles
  add column if not exists tip_notify_email boolean not null default true,
  add column if not exists forum_reply_notify_email boolean not null default true;

comment on column public.profiles.tip_notify_email is
  'Send email when creator receives a tip';

comment on column public.profiles.forum_reply_notify_email is
  'Send email when someone replies to user forum post';
