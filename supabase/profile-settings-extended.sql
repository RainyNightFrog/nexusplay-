-- 帳戶設定擴展：創作者支援信箱
alter table public.profiles
  add column if not exists support_email text;

comment on column public.profiles.support_email is
  '創作者對外支援信箱；玩家打賞或遇到問題時可聯絡';
