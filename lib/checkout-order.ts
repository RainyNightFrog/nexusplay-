export const ORDER_TYPES = ["game_purchase", "supporter_pass"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DEFAULT_SUPPORTER_BADGE = "supporter_v1" as const;

export type OrderRecord = {
  id: string;
  buyer_id: string;
  game_id: number | null;
  order_type: OrderType;
  game_price_cents: number;
  platform_tip_cents: number;
  total_amount_cents: number;
  stripe_session_id: string | null;
  status: OrderStatus;
  created_at: string;
};

export function parseOrderType(value: unknown): OrderType | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return (ORDER_TYPES as readonly string[]).includes(normalized)
    ? (normalized as OrderType)
    : null;
}

export function parseOrderStatus(value: unknown): OrderStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return (ORDER_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as OrderStatus)
    : "pending";
}

/** Sanitize platform tip to a non-negative integer (cents). */
export function sanitizePlatformTipCents(value: unknown): number {
  const raw =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? "").trim(), 10);

  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.trunc(raw));
}

export function sanitizeCents(value: unknown): number {
  const raw =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? "").trim(), 10);

  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.trunc(raw));
}

export function computeTotalAmountCents(
  gamePriceCents: number,
  platformTipCents: number
): number {
  return sanitizeCents(gamePriceCents) + sanitizePlatformTipCents(platformTipCents);
}

export function buildOrderAmounts(input: {
  gamePriceCents: unknown;
  platformTipCents?: unknown;
}): {
  game_price_cents: number;
  platform_tip_cents: number;
  total_amount_cents: number;
} {
  const game_price_cents = sanitizeCents(input.gamePriceCents);
  const platform_tip_cents = sanitizePlatformTipCents(
    input.platformTipCents ?? 0
  );

  return {
    game_price_cents,
    platform_tip_cents,
    total_amount_cents: game_price_cents + platform_tip_cents,
  };
}

/** Platform tip presets shown at checkout (USD). */
export const PLATFORM_TIP_PRESETS_USD = [0, 1, 3, 5] as const;

/** Maximum optional platform tip (USD). */
export const MAX_PLATFORM_TIP_USD = 500;

export const MAX_PLATFORM_TIP_CENTS = MAX_PLATFORM_TIP_USD * 100;

export type StripeConnectAmounts = {
  game_price_cents: number;
  platform_tip_cents: number;
  total_amount_cents: number;
  standard_commission_cents: number;
  application_fee_amount: number;
  creator_payout_cents: number;
};

/**
 * Bulletproof Connect split: creator net is always
 * `game_price_cents - standard_commission_cents`, independent of platform tip.
 */
export function computeStripeConnectAmounts(input: {
  gamePriceCents: number;
  platformTipCents: number;
  platformCommissionRate: number;
}): StripeConnectAmounts {
  const game_price_cents = sanitizeCents(input.gamePriceCents);
  const platform_tip_cents = sanitizePlatformTipCents(input.platformTipCents);
  const rate = Math.max(0, Math.min(1, input.platformCommissionRate));
  const standard_commission_cents = Math.round(game_price_cents * rate);
  const application_fee_amount =
    standard_commission_cents + platform_tip_cents;
  const total_amount_cents = game_price_cents + platform_tip_cents;
  const creator_payout_cents = game_price_cents - standard_commission_cents;

  return {
    game_price_cents,
    platform_tip_cents,
    total_amount_cents,
    standard_commission_cents,
    application_fee_amount,
    creator_payout_cents,
  };
}

export function parsePlatformTipInput(body: {
  platformTipAmount?: unknown;
  platformTipCents?: unknown;
}):
  | { ok: true; cents: number }
  | { ok: false; error: string } {
  if (body.platformTipCents !== undefined && body.platformTipCents !== null) {
    const raw =
      typeof body.platformTipCents === "number"
        ? body.platformTipCents
        : Number.parseInt(String(body.platformTipCents).trim(), 10);

    if (!Number.isFinite(raw)) {
      return { ok: false, error: "平台小費格式無效" };
    }
    if (raw < 0) {
      return { ok: false, error: "平台小費不可為負數" };
    }
    if (raw > MAX_PLATFORM_TIP_CENTS) {
      return {
        ok: false,
        error: `平台小費不可超過 $${MAX_PLATFORM_TIP_USD}`,
      };
    }
    return { ok: true, cents: Math.trunc(raw) };
  }

  if (body.platformTipAmount !== undefined && body.platformTipAmount !== null) {
    const raw =
      typeof body.platformTipAmount === "number"
        ? body.platformTipAmount
        : Number.parseFloat(String(body.platformTipAmount).trim());

    if (!Number.isFinite(raw)) {
      return { ok: false, error: "平台小費格式無效" };
    }
    if (raw < 0) {
      return { ok: false, error: "平台小費不可為負數" };
    }
    const cents = Math.round(raw * 100);
    if (cents > MAX_PLATFORM_TIP_CENTS) {
      return {
        ok: false,
        error: `平台小費不可超過 $${MAX_PLATFORM_TIP_USD}`,
      };
    }
    return { ok: true, cents };
  }

  return { ok: true, cents: 0 };
}
