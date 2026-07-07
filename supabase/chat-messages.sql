-- ============================================================
-- NexusPlay 即時聊天：chat_messages
-- 世界頻道 / 創作者頻道 · 7 天保留 · 訊息回收
-- ============================================================

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('world', 'creator')),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  recalled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_channel_created_idx
  on public.chat_messages (channel, created_at desc);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc);

create index if not exists chat_messages_retention_idx
  on public.chat_messages (created_at)
  where recalled_at is null;

alter table public.chat_messages enable row level security;

drop policy if exists "Authenticated read recent chat messages" on public.chat_messages;
create policy "Authenticated read recent chat messages"
  on public.chat_messages for select
  using (
    auth.uid() is not null
    and created_at > now() - interval '7 days'
  );

drop policy if exists "Authenticated insert own chat messages" on public.chat_messages;
create policy "Authenticated insert own chat messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users recall own chat messages" on public.chat_messages;
create policy "Users recall own chat messages"
  on public.chat_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable Supabase Realtime (ignore if already added)
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
