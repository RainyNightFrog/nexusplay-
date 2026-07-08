-- ============================================================
-- RainyNightFrog 安全強化：games 表 RLS 與 Storage 政策
-- 請在 Supabase Dashboard → SQL Editor 中執行
-- （若已有正式資料，建議先在測試環境驗證）
-- ============================================================

-- 1. 新增創作者欄位（關聯 auth.users）
alter table public.games
  add column if not exists creator_id uuid references auth.users (id) on delete set null;

create index if not exists games_creator_id_idx on public.games (creator_id);

-- 2. 確保 RLS 已啟用
alter table public.games enable row level security;

-- 3. 移除舊的寬鬆政策
drop policy if exists "Allow anon insert games" on public.games;
drop policy if exists "Public read games" on public.games;
drop policy if exists "Creators insert own games" on public.games;
drop policy if exists "Creators update own games" on public.games;
drop policy if exists "Creators delete own games" on public.games;

-- 4. games 表政策：公開讀取 Public；創作者可讀自己的 Draft
create policy "Public read games"
  on public.games
  for select
  to anon, authenticated
  using (
    publish_status = 'public'
    or (auth.uid() is not null and auth.uid() = creator_id)
  );

-- 5. 僅已登入的創作者可新增（creator_id 必須為本人）
create policy "Creators insert own games"
  on public.games
  for insert
  to authenticated
  with check (
    auth.uid() = creator_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'creator'
    )
  );

-- 6. 僅遊戲擁有者可更新
create policy "Creators update own games"
  on public.games
  for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

-- 7. 僅遊戲擁有者可刪除
create policy "Creators delete own games"
  on public.games
  for delete
  to authenticated
  using (auth.uid() = creator_id);

-- ============================================================
-- Storage 政策強化（移除匿名上傳）
-- ============================================================

drop policy if exists "Allow anon upload game covers" on storage.objects;
drop policy if exists "Allow anon upload game files" on storage.objects;
drop policy if exists "Creators upload game covers" on storage.objects;
drop policy if exists "Creators upload game files" on storage.objects;
drop policy if exists "Creators update own game covers" on storage.objects;
drop policy if exists "Creators update own game files" on storage.objects;
drop policy if exists "Creators delete own game files" on storage.objects;

-- 公開讀取（遊戲封面與 build 檔案需可被玩家載入）
drop policy if exists "Public read game covers" on storage.objects;
create policy "Public read game covers"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'game-covers');

drop policy if exists "Public read game files" on storage.objects;
create policy "Public read game files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'game-files');

-- 已登入創作者可上傳（伺服器端 API 仍使用 service role，此政策防禦直接 REST 濫用）
create policy "Creators upload game covers"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'game-covers'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'creator'
    )
  );

create policy "Creators upload game files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'game-files'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'creator'
    )
  );

-- 創作者可更新/刪除自己 bucket 內的物件（依 owner 欄位）
create policy "Creators update own game covers"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'game-covers' and owner = auth.uid())
  with check (bucket_id = 'game-covers' and owner = auth.uid());

create policy "Creators update own game files"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'game-files' and owner = auth.uid())
  with check (bucket_id = 'game-files' and owner = auth.uid());

create policy "Creators delete own game files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('game-files', 'game-covers')
    and owner = auth.uid()
  );
