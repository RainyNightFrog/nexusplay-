-- Add cancelled status for expired checkout sessions
-- 請在 Supabase Dashboard → SQL Editor 中執行，或 npm run db:orders-cancelled

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'succeeded', 'failed', 'refunded', 'cancelled'));

comment on column public.orders.status is
  'pending | succeeded | failed | refunded | cancelled (checkout expired)';
