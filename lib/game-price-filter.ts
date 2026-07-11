export type PriceFilterId = "all" | "free" | "under_5" | "under_15" | "on_sale";

export type GamePriceFilterParams = {
  isFree?: boolean;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
};

export const PRICE_FILTER_OPTIONS: Array<{
  id: PriceFilterId;
  params: GamePriceFilterParams;
}> = [
  { id: "all", params: {} },
  { id: "free", params: { isFree: true } },
  { id: "under_5", params: { maxPrice: 500 } },
  { id: "under_15", params: { maxPrice: 1500 } },
  { id: "on_sale", params: { onSale: true } },
];

export function priceFilterIdToParams(id: PriceFilterId): GamePriceFilterParams {
  return PRICE_FILTER_OPTIONS.find((option) => option.id === id)?.params ?? {};
}

export function parseOptionalCents(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

export function parseOptionalBoolean(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseGamePriceFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): GamePriceFilterParams {
  return {
    isFree: parseOptionalBoolean(searchParams.get("is_free")),
    minPrice: parseOptionalCents(searchParams.get("min_price")),
    maxPrice: parseOptionalCents(searchParams.get("max_price")),
    onSale: parseOptionalBoolean(searchParams.get("on_sale")),
  };
}

export function appendGamePriceFilterToSearchParams(
  params: URLSearchParams,
  filter: GamePriceFilterParams
) {
  if (filter.isFree) {
    params.set("is_free", "true");
  }
  if (filter.minPrice != null) {
    params.set("min_price", String(filter.minPrice));
  }
  if (filter.maxPrice != null) {
    params.set("max_price", String(filter.maxPrice));
  }
  if (filter.onSale) {
    params.set("on_sale", "true");
  }
}

export function hasActivePriceFilter(filter: GamePriceFilterParams): boolean {
  return Boolean(
    filter.isFree ||
      filter.onSale ||
      filter.minPrice != null ||
      filter.maxPrice != null
  );
}
