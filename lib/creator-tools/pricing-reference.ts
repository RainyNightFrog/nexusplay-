import type { GameGenre } from "@/lib/game-metadata";
import type { GamePricingType } from "@/lib/game-pricing";

export type PricingReferenceQuery = {
  genre?: GameGenre | "";
  tag?: string;
};

export type PricingReferenceStats = {
  sampleSize: number;
  freePercent: number;
  fixedPercent: number;
  pwywPercent: number;
  avgFixedPriceUsd: number | null;
  medianFixedPriceUsd: number | null;
  p25FixedPriceUsd: number | null;
  p75FixedPriceUsd: number | null;
  avgPwywMinUsd: number | null;
  suggestedRangeUsd: { min: number; max: number } | null;
};

export type PricingReferenceRecord = {
  pricing_type: GamePricingType;
  price: number | null;
  min_price: number | null;
};

function centsToUsd(cents: number | null | undefined) {
  if (cents == null || !Number.isFinite(cents)) return null;
  return Math.round((cents / 100) * 100) / 100;
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return null;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

export function computePricingReferenceStats(
  records: PricingReferenceRecord[]
): PricingReferenceStats {
  if (records.length === 0) {
    return {
      sampleSize: 0,
      freePercent: 0,
      fixedPercent: 0,
      pwywPercent: 0,
      avgFixedPriceUsd: null,
      medianFixedPriceUsd: null,
      p25FixedPriceUsd: null,
      p75FixedPriceUsd: null,
      avgPwywMinUsd: null,
      suggestedRangeUsd: null,
    };
  }

  const total = records.length;
  const freeCount = records.filter((r) => r.pricing_type === "free").length;
  const fixedRecords = records.filter((r) => r.pricing_type === "fixed");
  const pwywRecords = records.filter((r) => r.pricing_type === "pwyw");

  const fixedPrices = fixedRecords
    .map((r) => centsToUsd(r.price))
    .filter((v): v is number => v != null && v > 0)
    .sort((a, b) => a - b);

  const pwywMins = pwywRecords
    .map((r) => centsToUsd(r.min_price))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);

  const avgFixed =
    fixedPrices.length > 0
      ? Math.round(
          (fixedPrices.reduce((sum, v) => sum + v, 0) / fixedPrices.length) * 100
        ) / 100
      : null;

  const medianFixed = percentile(fixedPrices, 50);
  const p25 = percentile(fixedPrices, 25);
  const p75 = percentile(fixedPrices, 75);

  const avgPwywMin =
    pwywMins.length > 0
      ? Math.round(
          (pwywMins.reduce((sum, v) => sum + v, 0) / pwywMins.length) * 100
        ) / 100
      : null;

  let suggestedRange: { min: number; max: number } | null = null;
  if (p25 != null && p75 != null) {
    suggestedRange = { min: p25, max: p75 };
  } else if (avgFixed != null) {
    suggestedRange = {
      min: Math.max(0.99, Math.round(avgFixed * 0.6 * 100) / 100),
      max: Math.round(avgFixed * 1.4 * 100) / 100,
    };
  }

  return {
    sampleSize: total,
    freePercent: Math.round((freeCount / total) * 100),
    fixedPercent: Math.round((fixedRecords.length / total) * 100),
    pwywPercent: Math.round((pwywRecords.length / total) * 100),
    avgFixedPriceUsd: avgFixed,
    medianFixedPriceUsd: medianFixed,
    p25FixedPriceUsd: p25,
    p75FixedPriceUsd: p75,
    avgPwywMinUsd: avgPwywMin,
    suggestedRangeUsd: suggestedRange,
  };
}

export async function fetchPricingReference(
  query: PricingReferenceQuery
): Promise<PricingReferenceStats> {
  const params = new URLSearchParams();
  if (query.genre) params.set("genre", query.genre);
  if (query.tag) params.set("tag", query.tag);

  const response = await fetch(`/api/creator-tools/pricing-reference?${params}`);
  if (!response.ok) {
    throw new Error("pricing_reference_failed");
  }
  const data = (await response.json()) as PricingReferenceStats;
  return data;
}
