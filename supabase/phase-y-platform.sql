-- Phase Y: 論壇 Email 摘要偏好（伺服器端）
alter table public.profiles
  add column if not exists forum_email_digest boolean not null default true;

comment on column public.profiles.forum_email_digest is
  'Weekly forum digest email opt-in';
