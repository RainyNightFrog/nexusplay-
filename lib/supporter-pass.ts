export const SUPPORTER_PASS_TIERS = [
  {
    id: "supporter_5_once",
    priceCents: 500,
    interval: null,
    badge: "supporter_v1",
    labelKey: "tier5Once",
  },
  {
    id: "supporter_10_once",
    priceCents: 1000,
    interval: null,
    badge: "supporter_v2",
    labelKey: "tier10Once",
  },
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
