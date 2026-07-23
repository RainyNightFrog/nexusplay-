import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";

export type ApStoreCategory =
  | "title"
  | "name_color"
  | "avatar_frame"
  | "badge_effect";

export type ApStoreRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type ApStoreItem = {
  id: string;
  key: string;
  category: ApStoreCategory;
  rarity: ApStoreRarity;
  costAp: number;
  name: string;
  description: string;
  assetConfig: Record<string, unknown>;
  cssClass: string;
  unlockTitleId: string | null;
  isLimited: boolean;
  stockLimit: number | null;
  stockSold: number;
  stockRemaining: number | null;
  sortOrder: number;
  owned: boolean;
  equipped: boolean;
};

export type ApStoreDashboard = {
  balance: number;
  lifetimeEarned: number;
  items: ApStoreItem[];
};

function cssFromConfig(config: Record<string, unknown>) {
  return typeof config.cssClass === "string" ? config.cssClass : "";
}

function mapItem(
  row: Record<string, unknown>,
  ownedIds: Set<string>,
  equippedIds: Set<string>
): ApStoreItem {
  const assetConfig = (row.asset_config as Record<string, unknown>) ?? {};
  const stockLimit =
    row.stock_limit == null ? null : Number(row.stock_limit);
  const stockSold = Number(row.stock_sold) || 0;
  return {
    id: row.id as string,
    key: row.key as string,
    category: row.category as ApStoreCategory,
    rarity: row.rarity as ApStoreRarity,
    costAp: Number(row.cost_ap) || 0,
    name: row.name as string,
    description: (row.description as string) ?? "",
    assetConfig,
    cssClass: cssFromConfig(assetConfig),
    unlockTitleId: (row.unlock_title_id as string | null) ?? null,
    isLimited: row.is_limited === true,
    stockLimit,
    stockSold,
    stockRemaining:
      stockLimit == null ? null : Math.max(0, stockLimit - stockSold),
    sortOrder: Number(row.sort_order) || 100,
    owned: ownedIds.has(row.id as string),
    equipped: equippedIds.has(row.id as string),
  };
}

export async function getApBalance(
  userId: string,
  supabase?: SupabaseClient
): Promise<{ balance: number; lifetimeEarned: number }> {
  const client = supabase ?? createServerSupabase();
  const { data, error } = await client
    .from("user_ap_wallet")
    .select("balance, lifetime_earned")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    balance: Number(data?.balance) || 0,
    lifetimeEarned: Number(data?.lifetime_earned) || 0,
  };
}

export async function getApStoreDashboard(
  userId: string,
  supabase?: SupabaseClient
): Promise<ApStoreDashboard> {
  const client = supabase ?? createServerSupabase();
  const wallet = await getApBalance(userId, client);

  const [{ data: items, error: itemsError }, { data: inventory, error: invError }] =
    await Promise.all([
      client
        .from("ap_store_items")
        .select(
          "id, key, category, rarity, cost_ap, name, description, asset_config, unlock_title_id, is_limited, stock_limit, stock_sold, sort_order"
        )
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      client
        .from("user_ap_inventory")
        .select("item_id, is_equipped")
        .eq("user_id", userId),
    ]);

  if (itemsError) throw new Error(itemsError.message);
  if (invError) throw new Error(invError.message);

  const ownedIds = new Set(
    (inventory ?? []).map((row) => row.item_id as string)
  );
  const equippedIds = new Set(
    (inventory ?? [])
      .filter((row) => row.is_equipped === true)
      .map((row) => row.item_id as string)
  );

  return {
    balance: wallet.balance,
    lifetimeEarned: wallet.lifetimeEarned,
    items: (items ?? []).map((row) =>
      mapItem(row as Record<string, unknown>, ownedIds, equippedIds)
    ),
  };
}

export async function purchaseApStoreItem(
  userId: string,
  itemId: string,
  supabase?: SupabaseClient
) {
  const client = supabase ?? createServerSupabase();
  const { data, error } = await client.rpc("purchase_ap_item", {
    p_user_id: userId,
    p_item_id: itemId,
  });

  if (error) throw new Error(error.message);

  const result = data as {
    ok?: boolean;
    error?: string;
    balance?: number;
    cost_ap?: number;
    item_key?: string;
  };

  if (!result?.ok) {
    const code = result?.error ?? "purchase_failed";
    if (code === "insufficient_balance") {
      throw new Error("AP 餘額不足");
    }
    if (code === "already_owned") {
      throw new Error("已擁有此商品");
    }
    if (code === "out_of_stock") {
      throw new Error("商品已售罄");
    }
    if (code === "item_not_found") {
      throw new Error("找不到此商品");
    }
    throw new Error("購買失敗");
  }

  const dashboard = await getApStoreDashboard(userId, client);
  return { result, dashboard };
}

export async function equipApStoreItem(
  userId: string,
  itemId: string,
  equip: boolean,
  supabase?: SupabaseClient
) {
  const client = supabase ?? createServerSupabase();
  const { data, error } = await client.rpc("equip_ap_item", {
    p_user_id: userId,
    p_item_id: itemId,
    p_equip: equip,
  });

  if (error) throw new Error(error.message);

  const result = data as { ok?: boolean; error?: string };
  if (!result?.ok) {
    const code = result?.error ?? "equip_failed";
    if (code === "not_owned") throw new Error("尚未擁有此商品");
    if (code === "item_not_found") throw new Error("找不到此商品");
    throw new Error("裝備失敗");
  }

  const dashboard = await getApStoreDashboard(userId, client);
  return { result, dashboard };
}

/** 從 ap_store_items.asset_config 解析 CSS（供全站顯示） */
export async function resolveStoreCosmeticCssByKeys(
  supabase: SupabaseClient,
  keys: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(keys.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("ap_store_items")
    .select("key, asset_config")
    .in("key", unique);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const config = (row.asset_config as Record<string, unknown>) ?? {};
    const css = cssFromConfig(config);
    if (css) map.set(row.key as string, css);
  }
  return map;
}
