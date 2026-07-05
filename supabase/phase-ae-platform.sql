-- Phase AE: WebSub 訂閱紀錄、通知日誌、論壇摘要重試佇列

create table if not exists public.websub_subscriptions (
  id bigint generated always as identity primary key,
  topic_url text not null unique,
  callback_url text not null,
  lease_expires_at timestamptz,
  last_verified_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists websub_subscriptions_status_idx
  on public.websub_subscriptions (status, lease_expires_at);

create table if not exists public.websub_notifications (
  id bigint generated always as identity primary key,
  topic_url text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists websub_notifications_topic_idx
  on public.websub_notifications (topic_url, created_at desc);

create table if not exists public.forum_digest_retry_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  next_retry_at timestamptz not null,
  last_error text,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'exhausted', 'cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists forum_digest_retry_queue_pending_user_idx
  on public.forum_digest_retry_queue (user_id)
  where status = 'pending';

create index if not exists forum_digest_retry_queue_due_idx
  on public.forum_digest_retry_queue (status, next_retry_at)
  where status = 'pending';

alter table public.websub_subscriptions enable row level security;
alter table public.websub_notifications enable row level security;
alter table public.forum_digest_retry_queue enable row level security;

comment on table public.websub_subscriptions is
  'WebSub hub subscription registrations for platform feeds';
comment on table public.websub_notifications is
  'Inbound WebSub content update notifications audit log';
comment on table public.forum_digest_retry_queue is
  'Retry queue for failed weekly forum digest email deliveries';
