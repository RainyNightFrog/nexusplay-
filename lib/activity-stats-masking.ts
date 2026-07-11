import type { DonationPrivacyTier } from "@/lib/platform-leaderboard";

export type DonationRevealContext = {
  isSelf?: boolean;
  isAdmin?: boolean;
};

/** 公開顯示用打賞區間（不含精確金額） */
export function resolveDonationTier(amount: number): DonationPrivacyTier {
  if (amount <= 0) return "none";
  if (amount < 50) return "supporter";
  if (amount < 200) return "enthusiast";
  if (amount < 1000) return "patron";
  return "legend";
}

export function shouldRevealDonationAmount(context: DonationRevealContext): boolean {
  return Boolean(context.isSelf || context.isAdmin);
}

export function maskDonationAmount(
  amount: number,
  context: DonationRevealContext
): { value: number; isMasked: boolean; tier: DonationPrivacyTier } {
  const tier = resolveDonationTier(amount);
  if (shouldRevealDonationAmount(context)) {
    return { value: amount, isMasked: false, tier };
  }
  return { value: amount, isMasked: true, tier };
}

export function maskDonationTotalForProfile(
  amount: number,
  context: DonationRevealContext
): number | null {
  if (shouldRevealDonationAmount(context)) {
    return amount;
  }
  return null;
}
