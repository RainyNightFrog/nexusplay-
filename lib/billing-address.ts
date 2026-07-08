import { sanitizePlainText } from "@/lib/sanitize-plain";

export type BillingAddress = {
  billing_name: string | null;
  billing_line1: string | null;
  billing_line2: string | null;
  billing_city: string | null;
  billing_region: string | null;
  billing_postal: string | null;
  billing_country: string | null;
};

export const BILLING_LIMITS = {
  name: 120,
  line1: 200,
  line2: 200,
  city: 100,
  region: 100,
  postal: 32,
  country: 64,
} as const;

export function emptyBillingAddress(): BillingAddress {
  return {
    billing_name: null,
    billing_line1: null,
    billing_line2: null,
    billing_city: null,
    billing_region: null,
    billing_postal: null,
    billing_country: null,
  };
}

export function sanitizeBillingInput(input: Partial<BillingAddress>): BillingAddress {
  const read = (value: unknown, max: number) => {
    if (typeof value !== "string") return null;
    const trimmed = sanitizePlainText(value, max).trim();
    return trimmed || null;
  };

  return {
    billing_name: read(input.billing_name, BILLING_LIMITS.name),
    billing_line1: read(input.billing_line1, BILLING_LIMITS.line1),
    billing_line2: read(input.billing_line2, BILLING_LIMITS.line2),
    billing_city: read(input.billing_city, BILLING_LIMITS.city),
    billing_region: read(input.billing_region, BILLING_LIMITS.region),
    billing_postal: read(input.billing_postal, BILLING_LIMITS.postal),
    billing_country: read(input.billing_country, BILLING_LIMITS.country),
  };
}

export function billingAddressFromRow(row: Record<string, unknown>): BillingAddress {
  const read = (key: keyof BillingAddress) => {
    const value = row[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };

  return {
    billing_name: read("billing_name"),
    billing_line1: read("billing_line1"),
    billing_line2: read("billing_line2"),
    billing_city: read("billing_city"),
    billing_region: read("billing_region"),
    billing_postal: read("billing_postal"),
    billing_country: read("billing_country"),
  };
}

export function hasBillingAddress(address: BillingAddress) {
  return Boolean(
    address.billing_line1 &&
      address.billing_city &&
      address.billing_country
  );
}
