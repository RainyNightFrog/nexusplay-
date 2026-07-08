-- 擴充社群討論區貼文分類（在既有 forum_posts 表上執行）
alter table public.forum_posts
  drop constraint if exists forum_posts_category_check;

alter table public.forum_posts
  add constraint forum_posts_category_check
  check (category in (
    'general', 'bug', 'feedback', 'guide',
    'question', 'showcase', 'review', 'multiplayer',
    'meme', 'lore', 'speedrun', 'update'
  ));
