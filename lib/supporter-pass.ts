export const SUPPORTER_BILLING_INTERVALS = ["month", "year"] as const;
export type SupporterBillingInterval =
  (typeof SUPPORTER_BILLING_INTERVALS)[number];

export const SUPPORTER_PASS_TIERS = [
  {
    id: "supporter_5_monthly",
    priceCents: 500,
    interval: "month" as const,
    badge: "supporter_v1",
    labelKey: "tier5Monthly",
    bonusAp: 3_000,
  },
  {
    id: "supporter_10_monthly",
    priceCents: 1000,
    interval: "month" as const,
    badge: "supporter_v2",
    labelKey: "tier10Monthly",
    bonusAp: 8_000,
  },
  {
    id: "supporter_5_yearly",
    priceCents: 5000,
    interval: "year" as const,
    badge: "supporter_v1",
    labelKey: "tier5Yearly",
    bonusAp: 40_000,
  },
  {
    id: "supporter_10_yearly",
    priceCents: 10000,
    interval: "year" as const,
    badge: "supporter_v2",
    labelKey: "tier10Yearly",
    bonusAp: 100_000,
  },
] as const;

export type SupporterPassTierId = (typeof SUPPORTER_PASS_TIERS)[number]["id"];

export type SupporterPassTier = (typeof SUPPORTER_PASS_TIERS)[number];

/** 一次性永久支持者（最低 $250 USD） */
export const LIFETIME_SUPPORTER_TIER_ID = "supporter_lifetime" as const;
export const LIFETIME_SUPPORTER_MIN_USD = 250;
export const LIFETIME_SUPPORTER_MAX_USD = 10000;
export const LIFETIME_SUPPORTER_MIN_CENTS = LIFETIME_SUPPORTER_MIN_USD * 100;
export const LIFETIME_SUPPORTER_MAX_CENTS = LIFETIME_SUPPORTER_MAX_USD * 100;
export const LIFETIME_SUPPORTER_BADGE = "supporter_v2" as const;
/** 永久方案：每 1 USD 贈送 AP */
export const LIFETIME_SUPPORTER_BONUS_AP_PER_USD = 800;

export type CheckoutSelectionId =
  | SupporterPassTierId
  | typeof LIFETIME_SUPPORTER_TIER_ID;

export function parseSupporterPassTierId(
  value: unknown
): SupporterPassTier | null {
  const normalized = String(value ?? "").trim();
  return (
    SUPPORTER_PASS_TIERS.find((tier) => tier.id === normalized) ?? null
  );
}

export function isLifetimeSupporterTierId(value: unknown): boolean {
  return String(value ?? "").trim() === LIFETIME_SUPPORTER_TIER_ID;
}

export function formatTierPriceUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

export type ResolvedSupporterPassCheckout = {
  tierId: string;
  priceCents: number;
  badge: string;
  interval: SupporterBillingInterval | "lifetime";
  lifetime: boolean;
  bonusAp: number;
};

/** 永久方案依實付金額計算贈送 AP */
export function getLifetimeSupporterBonusAp(priceCents: number) {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return 0;
  const usd = priceCents / 100;
  return Math.floor(usd * LIFETIME_SUPPORTER_BONUS_AP_PER_USD);
}

export function getSupporterPassBonusAp(
  checkout: Pick<
    ResolvedSupporterPassCheckout,
    "lifetime" | "priceCents" | "bonusAp"
  >
) {
  if (checkout.lifetime) {
    return getLifetimeSupporterBonusAp(checkout.priceCents);
  }
  return Math.max(0, Math.floor(checkout.bonusAp));
}

/** 解析自訂永久支持金額（USD），最低 250 */
export function parseLifetimeSupporterAmountUsd(
  value: unknown
): { ok: true; usd: number; cents: number } | { ok: false; error: string } {
  const raw =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? "").trim());

  if (!Number.isFinite(raw)) {
    return { ok: false, error: "請輸入有效金額" };
  }

  const usd = Math.round(raw * 100) / 100;
  if (usd < LIFETIME_SUPPORTER_MIN_USD) {
    return {
      ok: false,
      error: `永久支持最低金額為 $${LIFETIME_SUPPORTER_MIN_USD} USD`,
    };
  }
  if (usd > LIFETIME_SUPPORTER_MAX_USD) {
    return {
      ok: false,
      error: `單次金額上限為 $${LIFETIME_SUPPORTER_MAX_USD} USD`,
    };
  }

  return {
    ok: true,
    usd,
    cents: Math.round(usd * 100),
  };
}

export function resolveSupporterPassCheckout(input: {
  tierId: string;
  customAmountUsd?: unknown;
}):
  | { ok: true; checkout: ResolvedSupporterPassCheckout }
  | { ok: false; error: string } {
  if (isLifetimeSupporterTierId(input.tierId)) {
    const amount = parseLifetimeSupporterAmountUsd(input.customAmountUsd);
    if (!amount.ok) {
      return { ok: false, error: amount.error };
    }

    const bonusAp = getLifetimeSupporterBonusAp(amount.cents);
    return {
      ok: true,
      checkout: {
        tierId: LIFETIME_SUPPORTER_TIER_ID,
        priceCents: amount.cents,
        badge: LIFETIME_SUPPORTER_BADGE,
        interval: "lifetime",
        lifetime: true,
        bonusAp,
      },
    };
  }

  const tier = parseSupporterPassTierId(input.tierId);
  if (!tier) {
    return { ok: false, error: "無效的支持者方案" };
  }

  return {
    ok: true,
    checkout: {
      tierId: tier.id,
      priceCents: tier.priceCents,
      badge: tier.badge,
      interval: tier.interval,
      lifetime: false,
      bonusAp: tier.bonusAp,
    },
  };
}
