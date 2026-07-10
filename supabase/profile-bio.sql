-- 個人資料：自我介紹（最多 300 字，公開顯示於玩家資料卡）
alter table public.profiles
  add column if not exists bio text;

comment on column public.profiles.bio is
  '玩家自我介紹；公開資料，顯示於玩家資料卡';
