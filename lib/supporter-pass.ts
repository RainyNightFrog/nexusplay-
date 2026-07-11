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
  },
  {
    id: "supporter_10_monthly",
    priceCents: 1000,
    interval: "month" as const,
    badge: "supporter_v2",
    labelKey: "tier10Monthly",
  },
  {
    id: "supporter_5_yearly",
    priceCents: 5000,
    interval: "year" as const,
    badge: "supporter_v1",
    labelKey: "tier5Yearly",
  },
  {
    id: "supporter_10_yearly",
    priceCents: 10000,
    interval: "year" as const,
    badge: "supporter_v2",
    labelKey: "tier10Yearly",
  },
] as const;

export type SupporterPassTierId = (typeof SUPPORTER_PASS_TIERS)[number]["id"];

export type SupporterPassTier = (typeof SUPPORTER_PASS_TIERS)[number];

export function parseSupporterPassTierId(
  value: unknown
): SupporterPassTier | null {
  const normalized = String(value ?? "").trim();
  return (
    SUPPORTER_PASS_TIERS.find((tier) => tier.id === normalized) ?? null
  );
}

export function formatTierPriceUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

export type ResolvedSupporterPassCheckout = {
  tierId: string;
  priceCents: number;
  badge: string;
  interval: SupporterBillingInterval;
};

export function resolveSupporterPassCheckout(input: { tierId: string }):
  | { ok: true; checkout: ResolvedSupporterPassCheckout }
  | { ok: false; error: string } {
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
    },
  };
}
