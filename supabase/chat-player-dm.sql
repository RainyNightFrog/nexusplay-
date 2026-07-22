-- ============================================================
-- RainyNightFrog 真實玩家私訊（雙人對話）
-- 或執行：npm run db:chat-player-dm
-- ============================================================

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unread_by_low boolean not null default false,
  unread_by_high boolean not null default false,
  created_at timestamptz not null default now(),
  constraint dm_threads_ordered_pair check (user_low < user_high),
  constraint dm_threads_unique_pair unique (user_low, user_high)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists dm_threads_user_low_last_idx
  on public.dm_threads (user_low, last_message_at desc);

create index if not exists dm_threads_user_high_last_idx
  on public.dm_threads (user_high, last_message_at desc);

create index if not exists dm_messages_thread_created_idx
  on public.dm_messages (thread_id, created_at asc);

create index if not exists dm_messages_created_idx
  on public.dm_messages (created_at);

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

grant select, insert, update, delete on public.dm_threads to service_role;
grant select, insert, update, delete on public.dm_messages to service_role;
grant select, insert, update on public.dm_threads to authenticated;
grant select, insert, update on public.dm_messages to authenticated;

drop policy if exists "Participants read own dm threads" on public.dm_threads;
create policy "Participants read own dm threads"
  on public.dm_threads
  for select
  using (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists "Participants insert own dm threads" on public.dm_threads;
create policy "Participants insert own dm threads"
  on public.dm_threads
  for insert
  with check (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists "Participants update own dm threads" on public.dm_threads;
create policy "Participants update own dm threads"
  on public.dm_threads
  for update
  using (auth.uid() = user_low or auth.uid() = user_high)
  with check (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists "Admins read all dm threads" on public.dm_threads;
create policy "Admins read all dm threads"
  on public.dm_threads
  for select
  using (public.is_admin());

drop policy if exists "Participants read own dm messages" on public.dm_messages;
create policy "Participants read own dm messages"
  on public.dm_messages
  for select
  using (
    exists (
      select 1
      from public.dm_threads t
      where t.id = thread_id
        and (t.user_low = auth.uid() or t.user_high = auth.uid())
    )
    and created_at >= (now() - interval '90 days')
  );

drop policy if exists "Participants insert own dm messages" on public.dm_messages;
create policy "Participants insert own dm messages"
  on public.dm_messages
  for insert
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1
      from public.dm_threads t
      where t.id = thread_id
        and (t.user_low = auth.uid() or t.user_high = auth.uid())
    )
  );

drop policy if exists "Admins read all dm messages" on public.dm_messages;
create policy "Admins read all dm messages"
  on public.dm_messages
  for select
  using (public.is_admin());
