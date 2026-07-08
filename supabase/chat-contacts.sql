-- ============================================================
-- RainyNightFrog 通訊錄：與虛擬玩家私訊 · 3 個月保留
-- 或執行：npm run db:chat-contacts
-- ============================================================

create table if not exists public.chat_virtual_dm_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  virtual_player_id text not null,
  sender text not null check (sender in ('user', 'virtual')),
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_virtual_dm_user_player_idx
  on public.chat_virtual_dm_messages (user_id, virtual_player_id, created_at desc);

create index if not exists chat_virtual_dm_retention_idx
  on public.chat_virtual_dm_messages (created_at);

alter table public.chat_virtual_dm_messages enable row level security;

drop policy if exists "Users read own virtual dm" on public.chat_virtual_dm_messages;
create policy "Users read own virtual dm"
  on public.chat_virtual_dm_messages
  for select
  using (
    auth.uid() = user_id
    and created_at > now() - interval '90 days'
  );

drop policy if exists "Users insert own virtual dm" on public.chat_virtual_dm_messages;
create policy "Users insert own virtual dm"
  on public.chat_virtual_dm_messages
  for insert
  with check (auth.uid() = user_id);
