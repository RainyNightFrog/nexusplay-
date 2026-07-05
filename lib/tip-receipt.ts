import type { SupabaseClient } from "@supabase/supabase-js";
import {
  billingAddressFromRow,
  hasBillingAddress,
  type BillingAddress,
} from "@/lib/billing-address";

export type TipBillingSnapshot = BillingAddress & {
  captured_at: string;
};

export type TipReceipt = {
  tipId: string;
  gameId: number;
  gameTitle: string;
  amountUsd: number;
  creatorNetUsd: number;
  platformFeeUsd: number;
  status: string;
  createdAt: string;
  billing: TipBillingSnapshot | null;
  billingComplete: boolean;
};

export async function loadPayerBillingSnapshot(
  supabase: SupabaseClient,
  payerId: string
): Promise<TipBillingSnapshot | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "billing_name, billing_line1, billing_line2, billing_city, billing_region, billing_postal, billing_country"
    )
    .eq("id", payerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const address = billingAddressFromRow(data as Record<string, unknown>);
  if (!hasBillingAddress(address)) {
    return null;
  }

  return {
    ...address,
    captured_at: new Date().toISOString(),
  };
}

export function parseBillingSnapshot(value: unknown): TipBillingSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const address = billingAddressFromRow(row);
  const capturedAt =
    typeof row.captured_at === "string" ? row.captured_at : null;

  if (!capturedAt || !hasBillingAddress(address)) {
    return null;
  }

  return { ...address, captured_at: capturedAt };
}

export function formatBillingLines(snapshot: TipBillingSnapshot | null): string[] {
  if (!snapshot) return [];

  const lines: string[] = [];
  if (snapshot.billing_name) lines.push(snapshot.billing_name);
  if (snapshot.billing_line1) lines.push(snapshot.billing_line1);
  if (snapshot.billing_line2) lines.push(snapshot.billing_line2);

  const cityLine = [
    snapshot.billing_city,
    snapshot.billing_region,
    snapshot.billing_postal,
  ]
    .filter(Boolean)
    .join(", ");

  if (cityLine) lines.push(cityLine);
  if (snapshot.billing_country) lines.push(snapshot.billing_country);

  return lines;
}

export function buildTipReceipt(params: {
  tip: {
    id: string;
    game_id: number;
    amount_usd: number | string;
    creator_net_usd: number | string;
    platform_fee_usd: number | string;
    status: string;
    created_at: string;
    billing_snapshot?: unknown;
  };
  gameTitle: string;
}): TipReceipt {
  const billing = parseBillingSnapshot(params.tip.billing_snapshot);

  return {
    tipId: params.tip.id,
    gameId: params.tip.game_id,
    gameTitle: params.gameTitle,
    amountUsd: roundUsd(params.tip.amount_usd),
    creatorNetUsd: roundUsd(params.tip.creator_net_usd),
    platformFeeUsd: roundUsd(params.tip.platform_fee_usd),
    status: params.tip.status,
    createdAt: params.tip.created_at,
    billing,
    billingComplete: billing != null,
  };
}

function roundUsd(value: number | string) {
  const numeric =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Math.round((Number.isFinite(numeric) ? numeric : 0) * 100) / 100;
}

export async function loadTipReceiptForPayer(
  supabase: SupabaseClient,
  tipId: string,
  payerId: string
): Promise<TipReceipt | null> {
  const { data: tip, error: tipError } = await supabase
    .from("game_tips")
    .select(
      "id, game_id, amount_usd, creator_net_usd, platform_fee_usd, status, created_at, billing_snapshot, payer_id"
    )
    .eq("id", tipId)
    .maybeSingle();

  if (tipError) {
    throw new Error(tipError.message);
  }

  if (!tip || tip.payer_id !== payerId) {
    return null;
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("title")
    .eq("id", tip.game_id)
    .maybeSingle();

  if (gameError) {
    throw new Error(gameError.message);
  }

  return buildTipReceipt({
    tip,
    gameTitle: game?.title ?? "",
  });
}
