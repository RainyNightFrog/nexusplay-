-- 遊戲特價標記（Price Filter: On Sale）
-- npm run db:on-sale

alter table public.games
  add column if not exists on_sale boolean not null default false;

comment on column public.games.on_sale is
  'Whether the game is currently on sale (for browse filters)';

create index if not exists games_on_sale_idx
  on public.games (on_sale)
  where on_sale = true;
