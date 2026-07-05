-- 遊戲發布元數據：標籤、視窗尺寸、AI 揭露、富文本詳情
-- 請在 Supabase Dashboard → SQL Editor 中執行，或 npm run db:publish-metadata

alter table public.games
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists viewport_width integer not null default 960,
  add column if not exists viewport_height integer not null default 600,
  add column if not exists fullscreen_button boolean not null default true,
  add column if not exists ai_disclosed boolean,
  add column if not exists ai_content_types jsonb not null default '[]'::jsonb,
  add column if not exists details_html text not null default '';

alter table public.games
  drop constraint if exists games_viewport_width_check;

alter table public.games
  add constraint games_viewport_width_check
  check (viewport_width >= 200 and viewport_width <= 3840);

alter table public.games
  drop constraint if exists games_viewport_height_check;

alter table public.games
  add constraint games_viewport_height_check
  check (viewport_height >= 200 and viewport_height <= 2160);

comment on column public.games.tags is '子標籤陣列（JSON string array，最多 10 個）';
comment on column public.games.viewport_width is '嵌入 iframe 寬度（px）';
comment on column public.games.viewport_height is '嵌入 iframe 高度（px）';
comment on column public.games.fullscreen_button is '是否在播放器顯示全螢幕按鈕';
comment on column public.games.ai_disclosed is '是否包含 AI 生成內容（true=是, false=否, null=未填）';
comment on column public.games.ai_content_types is 'AI 內容類型：graphics, sound, text, code';
comment on column public.games.details_html is '富文本遊戲詳情（HTML）';
