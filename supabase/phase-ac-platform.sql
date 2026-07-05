-- Phase AC: 論壇摘要寄送紀錄
create table if not exists public.forum_digest_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  locale text not null default 'zh-HK',
  post_count integer not null default 0 check (post_count >= 0),
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists forum_digest_deliveries_user_idx
  on public.forum_digest_deliveries (user_id, created_at desc);

alter table public.forum_digest_deliveries enable row level security;

drop policy if exists "Users read own digest deliveries" on public.forum_digest_deliveries;
create policy "Users read own digest deliveries"
  on public.forum_digest_deliveries
  for select
  using (auth.uid() = user_id);

comment on table public.forum_digest_deliveries is
  'Weekly forum digest email delivery audit log';
