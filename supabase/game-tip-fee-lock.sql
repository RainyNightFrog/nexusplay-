-- 打賞平台費率鎖定（早期創作者 grandfather）
-- 首次開啟打賞時寫入當下全站費率；日後全站調漲不影響已鎖定 0% 的遊戲
-- npm run db:tip-fee-lock

alter table public.games
  add column if not exists platform_fee_percent numeric(5, 2);

comment on column public.games.platform_fee_percent is
  '該遊戲鎖定的平台服務費率（%）。首次開啟打賞時寫入；null 表示尚未鎖定。';
