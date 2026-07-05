-- Phase L: 追蹤創作者新作 Email 通知偏好
alter table public.profiles
  add column if not exists follow_new_game_email boolean not null default true;

comment on column public.profiles.follow_new_game_email is
  'Email when a followed creator publishes a new public game';
