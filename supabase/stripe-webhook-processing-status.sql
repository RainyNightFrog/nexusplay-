-- Webhook 處理狀態：允許 processing，失敗可重試
-- 請在 Supabase SQL Editor 執行

alter table public.stripe_webhook_events
  add column if not exists status text not null default 'processed';

alter table public.stripe_webhook_events
  add column if not exists error_message text;

alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_status_check;

alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_check
  check (status in ('processing', 'processed', 'failed', 'skipped'));
