-- profiles.username：創作者專屬子網域（例如 username.rainynightfrog.com）
alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles add constraint profiles_username_format_check
  check (
    username is null
    or username ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

comment on column public.profiles.username is
  '創作者專屬子網域 username，對應 https://{username}.rainynightfrog.com';
