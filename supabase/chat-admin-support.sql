-- ============================================================
-- RainyNightFrog 創作者 ↔ 管理員支援私訊（共用收件匣）
-- 或執行：npm run db:chat-admin-support
-- ============================================================

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'closed')),
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unread_by_admin boolean not null default false,
  unread_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'admin')),
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists support_threads_last_message_idx
  on public.support_threads (last_message_at desc);

create index if not exists support_threads_unread_admin_idx
  on public.support_threads (unread_by_admin, last_message_at desc);

create index if not exists support_messages_thread_created_idx
  on public.support_messages (thread_id, created_at asc);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "Users read own support thread" on public.support_threads;
create policy "Users read own support thread"
  on public.support_threads
  for select
  using (auth.uid() = user_id);

drop policy if exists "Admins read all support threads" on public.support_threads;
create policy "Admins read all support threads"
  on public.support_threads
  for select
  using (public.is_admin());

drop policy if exists "Admins update support threads" on public.support_threads;
create policy "Admins update support threads"
  on public.support_threads
  for update
  using (public.is_admin());

drop policy if exists "Users read own support messages" on public.support_messages;
create policy "Users read own support messages"
  on public.support_messages
  for select
  using (
    exists (
      select 1
      from public.support_threads st
      where st.id = thread_id
        and st.user_id = auth.uid()
    )
  );

drop policy if exists "Admins read all support messages" on public.support_messages;
create policy "Admins read all support messages"
  on public.support_messages
  for select
  using (public.is_admin());
