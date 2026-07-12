-- ============================================================
-- RainyNightFrog 超級管理員擴充：封禁、審核、訂單、精選、Cron
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- 或 npm run db:admin-moderation
-- ============================================================

-- ----------------------------------------------------------------
-- 1. profiles：帳號狀態與聊天禁言
-- ----------------------------------------------------------------
alter table public.profiles
  add column if not exists account_status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended', 'banned'));

alter table public.profiles
  add column if not exists suspended_until timestamptz;

alter table public.profiles
  add column if not exists ban_reason text;

alter table public.profiles
  add column if not exists chat_muted_until timestamptz;

alter table public.profiles
  add column if not exists forum_posting_disabled boolean not null default false;

create index if not exists profiles_account_status_idx
  on public.profiles (account_status);

comment on column public.profiles.account_status is
  'active / suspended（暫停）/ banned（永久封禁）';
comment on column public.profiles.suspended_until is
  '暫停到期時間；到期後 middleware 可自動恢復 active';
comment on column public.profiles.chat_muted_until is
  '聊天禁言到期時間';

-- 阻擋 client 竄改帳號狀態欄位
create or replace function public.profiles_block_sensitive_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.creator_balance_usd is distinct from old.creator_balance_usd then
    raise exception 'cannot modify creator_balance_usd';
  end if;
  if new.stripe_connect_account_id is distinct from old.stripe_connect_account_id then
    raise exception 'cannot modify stripe_connect_account_id';
  end if;
  if new.stripe_account_id is distinct from old.stripe_account_id then
    raise exception 'cannot modify stripe_account_id';
  end if;
  if new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'cannot modify stripe_customer_id';
  end if;
  if new.payout_status is distinct from old.payout_status then
    raise exception 'cannot modify payout_status';
  end if;
  if new.payout_onboarded_at is distinct from old.payout_onboarded_at then
    raise exception 'cannot modify payout_onboarded_at';
  end if;
  if new.player_number is distinct from old.player_number then
    raise exception 'cannot modify player_number';
  end if;
  if new.is_supporter is distinct from old.is_supporter then
    raise exception 'cannot modify is_supporter';
  end if;
  if new.supporter_since is distinct from old.supporter_since then
    raise exception 'cannot modify supporter_since';
  end if;
  if new.supporter_badge is distinct from old.supporter_badge then
    raise exception 'cannot modify supporter_badge';
  end if;
  if new.account_status is distinct from old.account_status then
    raise exception 'cannot modify account_status';
  end if;
  if new.suspended_until is distinct from old.suspended_until then
    raise exception 'cannot modify suspended_until';
  end if;
  if new.ban_reason is distinct from old.ban_reason then
    raise exception 'cannot modify ban_reason';
  end if;
  if new.chat_muted_until is distinct from old.chat_muted_until then
    raise exception 'cannot modify chat_muted_until';
  end if;
  if new.forum_posting_disabled is distinct from old.forum_posting_disabled then
    raise exception 'cannot modify forum_posting_disabled';
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------
-- 2. forum_posts / forum_comments：審核欄位
-- ----------------------------------------------------------------
alter table public.forum_posts
  add column if not exists is_hidden boolean not null default false;

alter table public.forum_posts
  add column if not exists is_locked boolean not null default false;

alter table public.forum_posts
  add column if not exists hidden_at timestamptz;

alter table public.forum_posts
  add column if not exists hidden_by uuid references auth.users (id) on delete set null;

alter table public.forum_comments
  add column if not exists is_hidden boolean not null default false;

alter table public.forum_comments
  add column if not exists hidden_at timestamptz;

alter table public.forum_comments
  add column if not exists hidden_by uuid references auth.users (id) on delete set null;

create index if not exists forum_posts_moderation_idx
  on public.forum_posts (is_hidden, is_locked, created_at desc);

-- ----------------------------------------------------------------
-- 3. player_feedbacks：工單分類與備註
-- ----------------------------------------------------------------
alter table public.player_feedbacks
  add column if not exists category text not null default 'general';

alter table public.player_feedbacks
  drop constraint if exists player_feedbacks_category_check;

alter table public.player_feedbacks
  add constraint player_feedbacks_category_check
  check (category in ('general', 'bug', 'suggestion', 'report', 'billing', 'other'));

alter table public.player_feedbacks
  add column if not exists admin_notes text;

alter table public.player_feedbacks
  add column if not exists admin_reply text;

alter table public.player_feedbacks
  add column if not exists updated_at timestamptz not null default now();

-- ----------------------------------------------------------------
-- 4. games：後台精選策展
-- ----------------------------------------------------------------
alter table public.games
  add column if not exists is_featured boolean not null default false;

alter table public.games
  add column if not exists featured_badge text;

alter table public.games
  add column if not exists featured_sort integer not null default 0;

create index if not exists games_featured_sort_idx
  on public.games (is_featured, featured_sort desc, created_at desc);

-- ----------------------------------------------------------------
-- 5. stripe_webhook_events：處理狀態
-- ----------------------------------------------------------------
alter table public.stripe_webhook_events
  add column if not exists status text not null default 'processed';

alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_status_check;

alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_check
  check (status in ('processed', 'failed', 'skipped'));

alter table public.stripe_webhook_events
  add column if not exists error_message text;

alter table public.stripe_webhook_events
  add column if not exists payload_summary text;

-- ----------------------------------------------------------------
-- 6. platform_cron_runs：Cron 執行紀錄
-- ----------------------------------------------------------------
create table if not exists public.platform_cron_runs (
  job_name text primary key,
  last_run_at timestamptz not null default now(),
  last_status text not null default 'success'
    check (last_status in ('success', 'error')),
  last_error text,
  last_duration_ms integer,
  updated_at timestamptz not null default now()
);

alter table public.platform_cron_runs enable row level security;

drop policy if exists "Service role platform cron runs" on public.platform_cron_runs;
create policy "Service role platform cron runs"
  on public.platform_cron_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.platform_cron_runs is
  '各 Cron 任務最後執行時間與狀態（僅 service role 可寫）';
