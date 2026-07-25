import type { AppSettings } from "@/lib/app-settings";
import type { SupporterDisplayTier } from "@/lib/supporter-tier";

/** 目前檢視者是否應顯示支持者頭像特效（光環／角標） */
export function shouldShowSupporterAvatarFx(options: {
  settings: Pick<AppSettings, "disableCosmeticFx" | "hideMySupporterFx">;
  isSelf: boolean;
  tier: SupporterDisplayTier;
}): boolean {
  if (options.tier === "none") return false;
  if (options.settings.disableCosmeticFx) return false;
  if (options.settings.hideMySupporterFx && options.isSelf) return false;
  return true;
}
