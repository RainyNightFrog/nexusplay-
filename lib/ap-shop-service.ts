import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApShopItem,
  ApShopItemKind,
  ApWallet,
  EquippedCosmetics,
} from "@/lib/ap-shop";
import { EMPTY_COSMETICS } from "@/lib/ap-shop";
import type { RarityTier } from "@/lib/titles";

function isMissingApTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("user_ap_wallet") ||
    error.message?.includes("ap_shop") ||
    error.message?.includes("schema cache")
  );
}

export async function getApWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<ApWallet> {
  const { data, error } = await supabase
    .from("user_ap_wallet")
    .select("balance, lifetime_earned")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingApTable(error)) return { balance: 0, lifetime_earned: 0 };
    throw new Error(`讀取 AP 錢包失敗：${error.message}`);
  }

  return {
    balance: Number(data?.balance ?? 0),
    lifetime_earned: Number(data?.lifetime_earned ?? 0),
  };
}

export async function ensureApWalletBackfill(
  supabase: SupabaseClient,
  userId: string
): Promise<ApWallet> {
  const wallet = await getApWallet(supabase, userId);
  if (wallet.lifetime_earned > 0 || wallet.balance > 0) {
    return wallet;
  }

  const { data: unlocked, error } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  if (error) {
    if (isMissingApTable(error)) return wallet;
    throw new Error(`補發 AP 失敗：${error.message}`);
  }

  const ids = (unlocked ?? []).map((row) => row.achievement_id);
  if (ids.length === 0) return wallet;

  const { data: achievements, error: achError } = await supabase
    .from("achievements")
    .select("id, points")
    .in("id", ids);

  if (achError) {
    throw new Error(`補發 AP 失敗：${achError.message}`);
  }

  for (const achievement of achievements ?? []) {
    const points = Number(achievement.points ?? 0);
    if (points <= 0) continue;
    const { error: creditError } = await supabase.rpc("credit_ap", {
      p_user_id: userId,
      p_amount: points,
      p_reason: "achievement_unlock",
      p_ref_type: "achievement",
      p_ref_id: achievement.id,
    });
    if (creditError && !isMissingApTable(creditError)) {
      throw new Error(`補發 AP 失敗：${creditError.message}`);
    }
  }

  return getApWallet(supabase, userId);
}

type ShopItemRow = {
  id: string;
  code: string;
  kind: ApShopItemKind;
  name: string;
  description: string;
  price_ap: number;
  css_class: string;
  rarity_tier: RarityTier;
  unlock_title_id: string | null;
  sort_order: number;
};

export async function getEquippedCosmetics(
  supabase: SupabaseClient,
  userId: string
): Promise<EquippedCosmetics> {
  const { data, error } = await supabase
    .from("profiles")
    .select("equipped_avatar_frame, equipped_name_color, equipped_chat_bubble")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (
      isMissingApTable(error) ||
      error.message?.includes("equipped_avatar_frame") ||
      error.message?.includes("column")
    ) {
      return { ...EMPTY_COSMETICS };
    }
    throw new Error(`讀取外觀失敗：${error.message}`);
  }

  return {
    avatar_frame:
      typeof data?.equipped_avatar_frame === "string"
        ? data.equipped_avatar_frame
        : null,
    name_color:
      typeof data?.equipped_name_color === "string"
        ? data.equipped_name_color
        : null,
    chat_bubble:
      typeof data?.equipped_chat_bubble === "string"
        ? data.equipped_chat_bubble
        : null,
  };
}

export async function resolveEquippedCosmeticsMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, EquippedCosmetics>> {
  const result = new Map<string, EquippedCosmetics>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  for (const id of uniqueIds) {
    result.set(id, { ...EMPTY_COSMETICS });
  }
  if (uniqueIds.length === 0) return result;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, equipped_avatar_frame, equipped_name_color, equipped_chat_bubble"
    )
    .in("id", uniqueIds);

  if (error) {
    if (
      isMissingApTable(error) ||
      error.message?.includes("equipped_avatar_frame") ||
      error.message?.includes("column")
    ) {
      return result;
    }
    throw new Error(`批次讀取外觀失敗：${error.message}`);
  }

  for (const row of data ?? []) {
    result.set(row.id, {
      avatar_frame:
        typeof row.equipped_avatar_frame === "string"
          ? row.equipped_avatar_frame
          : null,
      name_color:
        typeof row.equipped_name_color === "string"
          ? row.equipped_name_color
          : null,
      chat_bubble:
        typeof row.equipped_chat_bubble === "string"
          ? row.equipped_chat_bubble
          : null,
    });
  }

  return result;
}

export async function resolveCosmeticCssByCodes(
  supabase: SupabaseClient,
  codes: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(codes.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("ap_shop_items")
    .select("code, css_class")
    .in("code", unique);

  if (error) {
    if (isMissingApTable(error)) return map;
    throw new Error(`讀取外觀樣式失敗：${error.message}`);
  }

  for (const row of data ?? []) {
    if (row.code && row.css_class) {
      map.set(row.code, row.css_class);
    }
  }
  return map;
}

export async function listApShopCatalog(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  wallet: ApWallet;
  items: ApShopItem[];
  equipped: EquippedCosmetics;
}> {
  const wallet = await ensureApWalletBackfill(supabase, userId);
  const equipped = await getEquippedCosmetics(supabase, userId);

  const { data: items, error: itemsError } = await supabase
    .from("ap_shop_items")
    .select(
      "id, code, kind, name, description, price_ap, css_class, rarity_tier, unlock_title_id, sort_order"
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    if (isMissingApTable(itemsError)) {
      return { wallet, items: [], equipped };
    }
    throw new Error(`讀取 AP 商店失敗：${itemsError.message}`);
  }

  const { data: purchases, error: purchaseError } = await supabase
    .from("user_ap_purchases")
    .select("item_id")
    .eq("user_id", userId);

  if (purchaseError && !isMissingApTable(purchaseError)) {
    throw new Error(`讀取購買紀錄失敗：${purchaseError.message}`);
  }

  const ownedIds = new Set((purchases ?? []).map((row) => row.item_id));

  const catalog: ApShopItem[] = ((items ?? []) as ShopItemRow[]).map((item) => {
    const owned = ownedIds.has(item.id);
    let equippedFlag = false;
    if (item.kind === "avatar_frame") {
      equippedFlag = equipped.avatar_frame === item.code;
    } else if (item.kind === "name_color") {
      equippedFlag = equipped.name_color === item.code;
    } else if (item.kind === "chat_bubble") {
      equippedFlag = equipped.chat_bubble === item.code;
    }

    return {
      ...item,
      owned,
      equipped: equippedFlag,
    };
  });

  return { wallet, items: catalog, equipped };
}

export async function purchaseApShopItem(
  supabase: SupabaseClient,
  userId: string,
  itemCode: string
): Promise<{
  ok: boolean;
  error?: string;
  balance?: number;
  price?: number;
  item_code?: string;
  kind?: string;
  title_id?: string | null;
}> {
  const { data, error } = await supabase.rpc("purchase_ap_item", {
    p_user_id: userId,
    p_item_code: itemCode.trim(),
  });

  if (error) {
    if (isMissingApTable(error)) {
      return { ok: false, error: "ap_shop_unavailable" };
    }
    throw new Error(`購買失敗：${error.message}`);
  }

  const payload = (data ?? {}) as {
    ok?: boolean;
    error?: string;
    balance?: number;
    price?: number;
    item_code?: string;
    kind?: string;
    title_id?: string | null;
  };

  return {
    ok: payload.ok === true,
    error: payload.error,
    balance: payload.balance,
    price: payload.price,
    item_code: payload.item_code,
    kind: payload.kind,
    title_id: payload.title_id ?? null,
  };
}

export async function equipApCosmetic(
  supabase: SupabaseClient,
  userId: string,
  kind: Exclude<ApShopItemKind, "title">,
  itemCode: string | null
): Promise<EquippedCosmetics> {
  if (itemCode) {
    const { data: item, error: itemError } = await supabase
      .from("ap_shop_items")
      .select("id, code, kind")
      .eq("code", itemCode)
      .eq("kind", kind)
      .eq("active", true)
      .maybeSingle();

    if (itemError) {
      throw new Error(`驗證商品失敗：${itemError.message}`);
    }
    if (!item) {
      throw new Error("找不到此外觀商品");
    }

    const { data: owned, error: ownedError } = await supabase
      .from("user_ap_purchases")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_id", item.id)
      .maybeSingle();

    if (ownedError) {
      throw new Error(`驗證擁有權失敗：${ownedError.message}`);
    }
    if (!owned) {
      throw new Error("你尚未購買此外觀");
    }
  }

  const column =
    kind === "avatar_frame"
      ? "equipped_avatar_frame"
      : kind === "name_color"
        ? "equipped_name_color"
        : "equipped_chat_bubble";

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ [column]: itemCode })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`更新外觀失敗：${updateError.message}`);
  }

  return getEquippedCosmetics(supabase, userId);
}
