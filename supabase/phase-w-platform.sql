-- Phase W: Web Push 分類開關
alter table public.profiles
  add column if not exists push_notify_tip boolean not null default true,
  add column if not exists push_notify_forum boolean not null default true,
  add column if not exists push_notify_follow boolean not null default true;

comment on column public.profiles.push_notify_tip is
  'Push notifications for creator tips';
comment on column public.profiles.push_notify_forum is
  'Push notifications for forum replies';
comment on column public.profiles.push_notify_follow is
  'Push notifications for followed creator new games';
