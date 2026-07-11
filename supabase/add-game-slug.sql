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
