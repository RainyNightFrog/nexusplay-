-- Phase AB: Email 摘要語系偏好
alter table public.profiles
  add column if not exists preferred_locale text not null default 'zh-HK';

comment on column public.profiles.preferred_locale is
  'User preferred locale for emails and digests (BCP 47 app locale code)';
