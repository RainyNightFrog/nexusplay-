export const GAME_PRICING_TYPES = ["free", "fixed", "pwyw"] as const;
export type GamePricingType = (typeof GAME_PRICING_TYPES)[number];

export const DEFAULT_PRICING_CURRENCY = "USD";
export const DEFAULT_PRICING_TYPE: GamePricingType = "free";

export type GamePricingValues = {
  pricingType: GamePricingType;
  priceAmount: string;
  minPriceAmount: string;
  currency: string;
  onSale: boolean;
};

export type GamePricingPayload = {
  pricing_type: GamePricingType;
  price: number;
  currency: string;
  min_price: number;
  on_sale: boolean;
};

export function defaultGamePricingValues(): GamePricingValues {
  return {
    pricingType: DEFAULT_PRICING_TYPE,
    priceAmount: "",
    minPriceAmount: "",
    currency: DEFAULT_PRICING_CURRENCY,
    onSale: false,
  };
}

export function parsePricingType(value: unknown): GamePricingType {
  const normalized = String(value ?? "").trim().toLowerCase();
  return (GAME_PRICING_TYPES as readonly string[]).includes(normalized)
    ? (normalized as GamePricingType)
    : DEFAULT_PRICING_TYPE;
}

export function centsToDisplayAmount(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export function parseDisplayAmountToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export function pricingValuesFromRecord(record: {
  pricing_type?: string | null;
  price?: number | null;
  min_price?: number | null;
  currency?: string | null;
  on_sale?: boolean | null;
}): GamePricingValues {
  const pricingType = parsePricingType(record.pricing_type);
  const priceCents =
    typeof record.price === "number" && Number.isFinite(record.price)
      ? Math.max(0, Math.trunc(record.price))
      : 0;
  const minPriceCents =
    typeof record.min_price === "number" && Number.isFinite(record.min_price)
      ? Math.max(0, Math.trunc(record.min_price))
      : 0;

  return {
    pricingType,
    priceAmount: centsToDisplayAmount(priceCents),
    minPriceAmount:
      pricingType === "pwyw" ? centsToDisplayAmount(minPriceCents) || "0" : "",
    currency:
      typeof record.currency === "string" && record.currency.trim()
        ? record.currency.trim().toUpperCase()
        : DEFAULT_PRICING_CURRENCY,
    onSale:
      pricingType !== "free" && record.on_sale === true,
  };
}

export function appendPricingToFormData(
  formData: FormData,
  values: GamePricingValues
) {
  formData.append("pricingType", values.pricingType);
  formData.append("currency", values.currency || DEFAULT_PRICING_CURRENCY);
  if (values.pricingType === "fixed" && values.priceAmount.trim()) {
    formData.append("priceAmount", values.priceAmount.trim());
  }
  if (values.pricingType === "pwyw") {
    formData.append("minPriceAmount", values.minPriceAmount.trim() || "0");
  }
  formData.append("onSale", String(values.onSale && values.pricingType !== "free"));
}

function parseOnSaleFromFormData(
  formData: FormData,
  pricingType: GamePricingType
): boolean {
  if (pricingType === "free") return false;
  return String(formData.get("onSale") ?? "false") === "true";
}

export function buildPricingDbPayload(
  data: GamePricingPayload
): GamePricingPayload {
  const pricingType = data.pricing_type;
  return {
    pricing_type: pricingType,
    price: Math.max(0, Math.trunc(data.price)),
    currency: data.currency || DEFAULT_PRICING_CURRENCY,
    min_price: Math.max(0, Math.trunc(data.min_price)),
    on_sale: pricingType !== "free" && data.on_sale === true,
  };
}

export function parsePricingFromFormData(
  formData: FormData
): { ok: true; data: GamePricingPayload } | { ok: false; error: string } {
  const pricingType = parsePricingType(formData.get("pricingType"));
  const currencyRaw = String(formData.get("currency") ?? DEFAULT_PRICING_CURRENCY)
    .trim()
    .toUpperCase();
  const currency = currencyRaw || DEFAULT_PRICING_CURRENCY;
  const onSale = parseOnSaleFromFormData(formData, pricingType);

  if (pricingType === "free") {
    return {
      ok: true,
      data: buildPricingDbPayload({
        pricing_type: "free",
        price: 0,
        currency,
        min_price: 0,
        on_sale: false,
      }),
    };
  }

  if (pricingType === "fixed") {
    const priceRaw = String(formData.get("priceAmount") ?? "").trim();
    if (!priceRaw) {
      return { ok: false, error: "請輸入固定售價" };
    }

    const priceCents = parseDisplayAmountToCents(priceRaw);
    if (priceCents == null) {
      return { ok: false, error: "售價格式無效" };
    }
    if (priceCents < 0) {
      return { ok: false, error: "售價不可為負數" };
    }
    if (priceCents === 0) {
      return { ok: false, error: "固定售價必須大於 0，或改選免費" };
    }

    return {
      ok: true,
      data: buildPricingDbPayload({
        pricing_type: "fixed",
        price: priceCents,
        currency,
        min_price: 0,
        on_sale: onSale,
      }),
    };
  }

  const minPriceRaw = String(formData.get("minPriceAmount") ?? "0").trim() || "0";
  const minPriceCents = parseDisplayAmountToCents(minPriceRaw);
  if (minPriceCents == null) {
    return { ok: false, error: "最低金額格式無效" };
  }
  if (minPriceCents < 0) {
    return { ok: false, error: "最低金額不可為負數" };
  }

  return {
    ok: true,
    data: buildPricingDbPayload({
      pricing_type: "pwyw",
      price: 0,
      currency,
      min_price: minPriceCents,
      on_sale: onSale,
    }),
  };
}
