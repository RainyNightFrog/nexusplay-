-- ============================================================
-- RainyNightFrog 通訊錄私訊：改為保留 3 個月（90 天）
-- 或執行：npm run db:chat-contacts-retention
-- ============================================================

create index if not exists chat_virtual_dm_retention_idx
  on public.chat_virtual_dm_messages (created_at);

drop policy if exists "Users read own virtual dm" on public.chat_virtual_dm_messages;
create policy "Users read own virtual dm"
  on public.chat_virtual_dm_messages
  for select
  using (
    auth.uid() = user_id
    and created_at > now() - interval '90 days'
  );
