-- 論壇：分類「其他」+ 允許所屬遊戲為空（hub「其他」）
-- 請在 Supabase SQL Editor 執行一次

alter table public.forum_posts
  drop constraint if exists forum_posts_category_check;

alter table public.forum_posts
  add constraint forum_posts_category_check
  check (category in (
    'general', 'bug', 'feedback', 'guide',
    'question', 'showcase', 'review', 'multiplayer',
    'meme', 'lore', 'speedrun', 'update', 'other'
  ));

alter table public.forum_posts
  alter column game_id drop not null;
