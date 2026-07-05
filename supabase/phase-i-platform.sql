-- Phase I: 創作者打賞通知計數 + 平台公告
alter table public.profiles
  add column if not exists unread_tip_count integer not null default 0;

comment on column public.profiles.unread_tip_count is
  'Unread tip notifications for creator dashboard badge';

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  href text,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'success')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists platform_announcements_active_idx
  on public.platform_announcements (active, created_at desc);

alter table public.platform_announcements enable row level security;

drop policy if exists "Public read active announcements" on public.platform_announcements;
create policy "Public read active announcements"
  on public.platform_announcements
  for select
  using (active = true);

drop policy if exists "Service role announcements" on public.platform_announcements;
create policy "Service role announcements"
  on public.platform_announcements
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
