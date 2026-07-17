-- ============================================================
-- RainyNightFrog AP 錢包／商店／外觀
-- 執行：npm run db:ap-shop
-- ============================================================

-- ------------------------------------------------------------
-- 錢包：可花餘額 + 生涯總分
-- ------------------------------------------------------------
create table if not exists public.user_ap_wallet (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  lifetime_earned int not null default 0 check (lifetime_earned >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists user_ap_wallet_lifetime_idx
  on public.user_ap_wallet (lifetime_earned desc);

-- ------------------------------------------------------------
-- 帳本
-- ------------------------------------------------------------
create table if not exists public.ap_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null,
  balance_after int not null check (balance_after >= 0),
  reason text not null,
  ref_type text,
  ref_id text,
  created_at timestamptz not null default now()
);

create index if not exists ap_ledger_user_created_idx
  on public.ap_ledger (user_id, created_at desc);

-- ------------------------------------------------------------
-- 商店商品
-- ------------------------------------------------------------
create table if not exists public.ap_shop_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null
    check (kind in ('avatar_frame', 'name_color', 'chat_bubble', 'title')),
  name text not null,
  description text not null default '',
  price_ap int not null check (price_ap > 0),
  css_class text not null default '',
  rarity_tier text not null default 'common'
    check (rarity_tier in ('common', 'rare', 'epic', 'legendary')),
  unlock_title_id uuid references public.titles (id) on delete set null,
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ap_shop_items_active_sort_idx
  on public.ap_shop_items (active, sort_order, price_ap);

-- ------------------------------------------------------------
-- 購買紀錄（冪等：每人每商品一次）
-- ------------------------------------------------------------
create table if not exists public.user_ap_purchases (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.ap_shop_items (id) on delete cascade,
  title_id uuid references public.titles (id) on delete set null,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists user_ap_purchases_user_idx
  on public.user_ap_purchases (user_id, purchased_at desc);

-- ------------------------------------------------------------
-- profiles：已裝備外觀（存商店 item code）
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists equipped_avatar_frame text,
  add column if not exists equipped_name_color text,
  add column if not exists equipped_chat_bubble text;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.user_ap_wallet enable row level security;
alter table public.ap_ledger enable row level security;
alter table public.ap_shop_items enable row level security;
alter table public.user_ap_purchases enable row level security;

drop policy if exists "Users read own ap wallet" on public.user_ap_wallet;
create policy "Users read own ap wallet"
  on public.user_ap_wallet for select
  using (auth.uid() = user_id);

drop policy if exists "Users read own ap ledger" on public.ap_ledger;
create policy "Users read own ap ledger"
  on public.ap_ledger for select
  using (auth.uid() = user_id);

drop policy if exists "Public read ap shop items" on public.ap_shop_items;
create policy "Public read ap shop items"
  on public.ap_shop_items for select
  using (active = true);

drop policy if exists "Users read own ap purchases" on public.user_ap_purchases;
create policy "Users read own ap purchases"
  on public.user_ap_purchases for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 入帳（冪等：同 reason+ref 不重複）
-- ------------------------------------------------------------
create or replace function public.credit_ap(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_exists boolean;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    return false;
  end if;

  if p_reason is null or trim(p_reason) = '' then
    return false;
  end if;

  if p_ref_type is not null and p_ref_id is not null then
    select exists (
      select 1 from public.ap_ledger
      where user_id = p_user_id
        and reason = p_reason
        and ref_type = p_ref_type
        and ref_id = p_ref_id
    ) into v_exists;
    if v_exists then
      return false;
    end if;
  end if;

  insert into public.user_ap_wallet (user_id, balance, lifetime_earned, updated_at)
  values (p_user_id, p_amount, p_amount, now())
  on conflict (user_id) do update set
    balance = user_ap_wallet.balance + excluded.balance,
    lifetime_earned = user_ap_wallet.lifetime_earned + excluded.lifetime_earned,
    updated_at = now();

  select balance into v_balance
  from public.user_ap_wallet
  where user_id = p_user_id;

  insert into public.ap_ledger (user_id, delta, balance_after, reason, ref_type, ref_id)
  values (p_user_id, p_amount, v_balance, p_reason, p_ref_type, p_ref_id);

  return true;
end;
$$;

revoke all on function public.credit_ap(uuid, int, text, text, text) from public;
grant execute on function public.credit_ap(uuid, int, text, text, text) to service_role;

-- ------------------------------------------------------------
-- 解鎖成就時寫入 AP
-- ------------------------------------------------------------
create or replace function public.grant_achievement(
  p_user_id uuid,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement_id uuid;
  v_points int;
  v_granted boolean := false;
begin
  if p_user_id is null or p_code is null or trim(p_code) = '' then
    return false;
  end if;

  select id, points into v_achievement_id, v_points
  from public.achievements
  where code = trim(p_code);

  if v_achievement_id is null then
    return false;
  end if;

  with inserted as (
    insert into public.user_achievements (user_id, achievement_id)
    values (p_user_id, v_achievement_id)
    on conflict (user_id, achievement_id) do nothing
    returning 1
  )
  select exists (select 1 from inserted) into v_granted;

  if v_granted and coalesce(v_points, 0) > 0 then
    perform public.credit_ap(
      p_user_id,
      v_points,
      'achievement_unlock',
      'achievement',
      v_achievement_id::text
    );
  end if;

  return v_granted;
end;
$$;

revoke all on function public.grant_achievement(uuid, text) from public;
grant execute on function public.grant_achievement(uuid, text) to service_role;

-- ------------------------------------------------------------
-- 購買商品（原子扣款）
-- ------------------------------------------------------------
create or replace function public.purchase_ap_item(
  p_user_id uuid,
  p_item_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.ap_shop_items%rowtype;
  v_balance int;
  v_new_balance int;
  v_owned boolean;
begin
  if p_user_id is null or p_item_code is null or trim(p_item_code) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  select * into v_item
  from public.ap_shop_items
  where code = trim(p_item_code) and active = true;

  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  select exists (
    select 1 from public.user_ap_purchases
    where user_id = p_user_id and item_id = v_item.id
  ) into v_owned;

  if v_owned then
    return jsonb_build_object('ok', false, 'error', 'already_owned');
  end if;

  insert into public.user_ap_wallet (user_id, balance, lifetime_earned, updated_at)
  values (p_user_id, 0, 0, now())
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.user_ap_wallet
  where user_id = p_user_id
  for update;

  if coalesce(v_balance, 0) < v_item.price_ap then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_balance',
      'balance', coalesce(v_balance, 0),
      'price', v_item.price_ap
    );
  end if;

  v_new_balance := v_balance - v_item.price_ap;

  update public.user_ap_wallet
  set balance = v_new_balance, updated_at = now()
  where user_id = p_user_id;

  insert into public.ap_ledger (user_id, delta, balance_after, reason, ref_type, ref_id)
  values (
    p_user_id,
    -v_item.price_ap,
    v_new_balance,
    'purchase',
    'shop_item',
    v_item.id::text
  );

  insert into public.user_ap_purchases (user_id, item_id, title_id)
  values (p_user_id, v_item.id, v_item.unlock_title_id);

  if v_item.kind = 'title' and v_item.unlock_title_id is not null then
    insert into public.user_titles (user_id, title_id)
    values (p_user_id, v_item.unlock_title_id)
    on conflict (user_id, title_id) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'item_code', v_item.code,
    'kind', v_item.kind,
    'price', v_item.price_ap,
    'balance', v_new_balance,
    'title_id', v_item.unlock_title_id
  );
end;
$$;

revoke all on function public.purchase_ap_item(uuid, text) from public;
grant execute on function public.purchase_ap_item(uuid, text) to service_role;

-- ------------------------------------------------------------
-- 既有玩家 backfill：依已解鎖成就補發可花 AP（僅尚未入帳者）
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select ua.user_id, a.id as achievement_id, a.points
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
    where a.points > 0
      and not exists (
        select 1 from public.ap_ledger l
        where l.user_id = ua.user_id
          and l.reason = 'achievement_unlock'
          and l.ref_type = 'achievement'
          and l.ref_id = a.id::text
      )
  loop
    perform public.credit_ap(
      r.user_id,
      r.points,
      'achievement_unlock',
      'achievement',
      r.achievement_id::text
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- AP 專屬稱號（商店用，非成就解鎖）
-- ------------------------------------------------------------
insert into public.titles (name, css_class, rarity_tier, unlock_achievement_id)
select v.name, v.css_class, v.rarity_tier, null
from (
  values
    ('AP 先驅', 'title-tier-rare', 'rare'),
    ('霓虹旅人', 'title-tier-epic', 'epic'),
    ('點數帝王', 'title-special-immortal', 'legendary')
) as v(name, css_class, rarity_tier)
where not exists (
  select 1 from public.titles t
  where t.name = v.name and t.unlock_achievement_id is null
);

-- ------------------------------------------------------------
-- 種子商品
-- ------------------------------------------------------------
insert into public.ap_shop_items (
  code, kind, name, description, price_ap, css_class, rarity_tier, unlock_title_id, sort_order, active
)
select
  v.code, v.kind, v.name, v.description, v.price_ap, v.css_class, v.rarity_tier,
  t.id, v.sort_order, true
from (
  values
    ('title_ap_pioneer', 'title', '稱號：AP 先驅', '用成就點兌換的專屬稱號，證明你願意投資收集。', 120, '', 'rare', 'AP 先驅', 10),
    ('title_neon_wanderer', 'title', '稱號：霓虹旅人', '史詩級可兌換稱號，霓虹色澤閃爍。', 280, '', 'epic', '霓虹旅人', 20),
    ('title_point_emperor', 'title', '稱號：點數帝王', '傳奇級可兌換稱號，AP 經濟的終極象徵。', 800, '', 'legendary', '點數帝王', 30)
) as v(code, kind, name, description, price_ap, css_class, rarity_tier, title_name, sort_order)
left join public.titles t
  on t.name = v.title_name and t.unlock_achievement_id is null
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_ap = excluded.price_ap,
  css_class = excluded.css_class,
  rarity_tier = excluded.rarity_tier,
  unlock_title_id = excluded.unlock_title_id,
  sort_order = excluded.sort_order,
  active = true;

insert into public.ap_shop_items (
  code, kind, name, description, price_ap, css_class, rarity_tier, unlock_title_id, sort_order, active
)
values
  ('frame_cyan_ring', 'avatar_frame', '頭像框：青環', '淡青色光環頭像框，低調有型。', 80, 'ap-frame-cyan', 'common', null, 40, true),
  ('frame_violet_glow', 'avatar_frame', '頭像框：紫輝', '紫色柔光頭像框。', 150, 'ap-frame-violet', 'rare', null, 50, true),
  ('frame_gold_crown', 'avatar_frame', '頭像框：金冕', '金色脈動頭像框，極顯眼。', 400, 'ap-frame-gold', 'epic', null, 60, true),
  ('name_cyan', 'name_color', '名字色：青焰', '名字改為青色發光。', 60, 'ap-name-cyan', 'common', null, 70, true),
  ('name_rose', 'name_color', '名字色：玫粉', '名字改為玫粉色發光。', 100, 'ap-name-rose', 'rare', null, 80, true),
  ('name_aurora', 'name_color', '名字色：極光', '名字套用極光漸層動畫。', 350, 'ap-name-aurora', 'epic', null, 90, true),
  ('bubble_mint', 'chat_bubble', '氣泡：薄荷', '聊天氣泡改為薄荷綠色調。', 90, 'ap-bubble-mint', 'common', null, 100, true),
  ('bubble_sunset', 'chat_bubble', '氣泡：夕燒', '聊天氣泡改為橙粉夕燒。', 180, 'ap-bubble-sunset', 'rare', null, 110, true),
  ('bubble_void', 'chat_bubble', '氣泡：虛空', '聊天氣泡改為深紫虛空風格。', 450, 'ap-bubble-void', 'epic', null, 120, true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_ap = excluded.price_ap,
  css_class = excluded.css_class,
  rarity_tier = excluded.rarity_tier,
  sort_order = excluded.sort_order,
  active = true;
