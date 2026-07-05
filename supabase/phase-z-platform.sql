-- Phase Z: 論壇摘要寄送紀錄
alter table public.profiles
  add column if not exists forum_digest_last_sent_at timestamptz;

comment on column public.profiles.forum_digest_last_sent_at is
  'Last weekly forum digest email sent at (UTC)';
