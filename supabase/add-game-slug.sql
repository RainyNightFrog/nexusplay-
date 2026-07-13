-- games.slug：遊戲專屬子網域識別（例如 void-gacha.rainynightfrog.com）
alter table public.games add column if not exists slug text;

create unique index if not exists games_slug_unique_idx
  on public.games (slug)
  where slug is not null;

alter table public.games drop constraint if exists games_slug_format_check;
alter table public.games add constraint games_slug_format_check
  check (
    slug is null
    or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

comment on column public.games.slug is
  '遊戲專屬子網域 slug，對應 https://{slug}.rainynightfrog.com';

-- 為平台既有示範遊戲填入 catalog slug（依標題對應）
update public.games set slug = 'void-gacha'
where slug is null and title = 'VOID GACHA';

update public.games set slug = 'core-defense'
where slug is null and title = 'CoreDefense: Mindustry X';

update public.games set slug = 'cyber-fortune'
where slug is null and title = 'CyberFortune 012';

update public.games set slug = 'neon-abyss-runner'
where slug is null and title = 'Neon Abyss: Void Runner';

update public.games set slug = 'signal-breach'
where slug is null and title = 'Signal Breach: ICE Protocol';

update public.games set slug = 'void-relay'
where slug is null and title = 'Void Relay: Card Descent';

update public.games set slug = 'pulse-protocol'
where slug is null and title = 'Pulse Protocol: Neon Beat';

update public.games set slug = 'orbital-salvage'
where slug is null and title = '軌道回收：環形防線';

update public.games set rating_avg = 4.80
where slug = 'void-gacha' or title = 'VOID GACHA';

-- 平台示範遊戲遊玩次數調整為約 3k～20k（避免誇張數字）
update public.games set plays_count = 18240 where slug = 'void-gacha' or title = 'VOID GACHA';
update public.games set plays_count = 16580 where slug = 'core-defense' or title = 'CoreDefense: Mindustry X';
update public.games set plays_count = 12430 where slug = 'cyber-fortune' or title = 'CyberFortune 012';
update public.games set plays_count = 9870 where slug = 'neon-abyss-runner' or title = 'Neon Abyss: Void Runner';
update public.games set plays_count = 7650 where slug = 'signal-breach' or title = 'Signal Breach: ICE Protocol';
update public.games set plays_count = 14920 where slug = 'void-relay' or title = 'Void Relay: Card Descent';
update public.games set plays_count = 6340 where slug = 'pulse-protocol' or title = 'Pulse Protocol: Neon Beat';
update public.games set plays_count = 5180 where slug = 'orbital-salvage' or title = '軌道回收：環形防線';
