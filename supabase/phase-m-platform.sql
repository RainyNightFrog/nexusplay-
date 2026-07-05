-- Phase M: 站內通知中心
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null
    check (kind in ('tip_received', 'forum_reply', 'followed_new_game')),
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, read, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "Users manage own notifications" on public.user_notifications;
create policy "Users manage own notifications"
  on public.user_notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.user_notifications is
  'In-app notification inbox for tips, forum replies, and followed creator releases';
