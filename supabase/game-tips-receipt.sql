-- 打賞收據：結帳時快照帳單地址
alter table public.game_tips
  add column if not exists billing_snapshot jsonb;

comment on column public.game_tips.billing_snapshot is
  'Payer billing address snapshot at checkout (from profiles.billing_*)';
