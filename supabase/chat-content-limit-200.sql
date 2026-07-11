-- ============================================================
-- 即時聊天／通訊錄私訊：單則訊息上限改為 200 字
-- 或執行：npm run db:chat-content-limit
-- ============================================================

do $$
declare
  constraint_name text;
begin
  select c.conname
  into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'chat_virtual_dm_messages'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%char_length(content)%';

  if constraint_name is not null then
    execute format(
      'alter table public.chat_virtual_dm_messages drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.chat_virtual_dm_messages
  drop constraint if exists chat_virtual_dm_messages_content_len_check;

alter table public.chat_virtual_dm_messages
  add constraint chat_virtual_dm_messages_content_len_check
  check (char_length(content) between 1 and 200);
