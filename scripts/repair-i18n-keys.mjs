import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");

const EN_OVERRIDES = {
  "accountSettings.navFavorites": "Favorites",
  "accountSettings.navFollowing": "Following",
  "accountSettings.favoritesTitle": "My favorites",
  "accountSettings.favoritesDesc": "Games you saved for quick access.",
  "accountSettings.favoritesEmpty": "No favorites yet",
  "accountSettings.favoritesBrowse": "Browse games",
  "accountSettings.followingTitle": "Following",
  "accountSettings.followingDesc": "Creators you follow — jump to their pages and new releases.",
  "accountSettings.followingEmpty": "Not following anyone yet",
  "accountSettings.followingUnfollow": "Unfollow",
  "accountSettings.paymentSaveCard": "Save card",
  "accountSettings.paymentSetupCancel": "Cancel",
  "accountSettings.paymentSetupFailed": "Could not start card setup",
  "accountSettings.paymentRemoveCard": "Remove",
  "accountSettings.paymentRemoveFailed": "Failed to remove card",
  "accountSettings.paymentTipsSection": "My tips",
  "accountSettings.paymentTipsDesc": "Games you supported and amounts. Download receipts for your records.",
  "accountSettings.paymentTipsEmpty": "No tip history yet",
  "accountSettings.paymentTipsReceipt": "Receipt",
  "accountSettings.paymentTipStatus_succeeded": "Succeeded",
  "accountSettings.paymentTipStatus_preview": "Preview",
  "accountSettings.paymentTipStatus_pending": "Pending",
  "accountSettings.paymentTipStatus_failed": "Failed",
  "accountSettings.paymentTipStatus_refunded": "Refunded",
  "accountSettings.twoFactorEnabled": "Enabled",
  "accountSettings.twoFactorDisabled": "Disabled",
  "accountSettings.twoFactorEnableBtn": "Enable 2FA",
  "accountSettings.twoFactorDisableBtn": "Disable 2FA",
  "accountSettings.twoFactorConfirmBtn": "Confirm and enable",
  "accountSettings.twoFactorCancelBtn": "Cancel",
  "accountSettings.twoFactorScanHint":
    "Scan the QR code with Google Authenticator or another TOTP app, then enter the 6-digit code.",
  "accountSettings.twoFactorCodeLabel": "Verification code",
  "accountSettings.twoFactorQrAlt": "2FA QR code",
  "accountSettings.twoFactorActiveHint": "Two-factor authentication is enabled on your account.",
  "accountSettings.twoFactorLoadFailed": "Failed to load 2FA status",
  "accountSettings.twoFactorEnrollFailed": "Could not start 2FA setup",
  "accountSettings.twoFactorVerifyFailed": "Invalid code, please try again",
  "accountSettings.twoFactorDisableFailed": "Failed to disable 2FA",
  "auth.mfaChallengeTitle": "Two-factor authentication",
  "auth.mfaChallengeDesc":
    "This account has 2FA enabled. Enter the 6-digit code from your authenticator app.",
  "auth.mfaCodeLabel": "Verification code",
  "auth.mfaVerifyBtn": "Verify and sign in",
  "auth.mfaCancelBtn": "Cancel",
  "auth.mfaVerifyFailed": "Invalid code, please try again",
  "common.favoriteAdded": "Added to favorites",
  "common.favoriteRemoved": "Removed from favorites",
  "common.favoriteFailed": "Favorite action failed",
  "dashboard.unreadTipsBadge": "{count} new tip(s)",
  "game.tipReceiptTitle": "Tip receipt",
  "game.tipReceiptBilling": "Billing address",
  "game.tipReceiptNoBilling": "No billing address yet. Go to",
  "game.tipReceiptBillingLink": "Billing settings",
  "game.tipBillingHint": "Set a billing address to show on receipts",
  "game.tipSavedCardsTitle": "Use a saved card",
  "game.tipUseNewCard": "Use a new card",
  "game.tipAnonymousLabel": "Show anonymously on supporter wall",
  "game.tipAnonymousDesc":
    "When checked, your name is hidden on the public supporter wall (creators still see transaction records).",
  "game.anonymousSupporter": "Anonymous supporter",
  "game.supporterWallTitle": "Recent supporters",
  "game.viewCreatorProfile": "View creator profile",
  "home.favoritesSectionTitle": "My favorites",
  "home.favoritesSectionDesc": "Jump back to games you love",
  "home.favoritesViewAll": "View all favorites",
  "home.followingFeedTitle": "New from creators you follow",
  "home.followingFeedDesc": "Latest releases from creators you follow",
  "home.followingViewAll": "Manage following",
  "legal.navPrivacy": "Privacy Policy",
  "legal.privacyTitle": "Privacy Policy",
  "legal.privacyP1":
    "NexusPlay collects account data (email, display name), uploaded game content, play and analytics events, and tip/payout records to operate the platform.",
  "legal.privacyP2":
    "Billing addresses are used for receipts and compliance; payment card data is processed by Stripe and full card numbers are not stored on our servers.",
  "legal.privacyP3":
    "You can export personal data or delete your account under Data & account. Exports include tip receipts and transaction history.",
  "legal.privacyP4":
    "We may use cookies and analytics to improve the service; if Google Analytics is enabled, you can limit tracking in your browser settings.",
};

function deepFillMissing(target, template, path = "") {
  let added = 0;
  for (const key of Object.keys(template)) {
    const fullPath = path ? `${path}.${key}` : key;
    const templateValue = template[key];

    if (
      templateValue &&
      typeof templateValue === "object" &&
      !Array.isArray(templateValue)
    ) {
      if (!(key in target) || typeof target[key] !== "object" || target[key] === null) {
        target[key] = target[key] && typeof target[key] === "object" ? target[key] : {};
      }
      added += deepFillMissing(target[key], templateValue, fullPath);
      continue;
    }

    if (!(key in target)) {
      target[key] = EN_OVERRIDES[fullPath] ?? templateValue;
      added += 1;
    }
  }
  return added;
}

const enPath = resolve(dir, "en.json");
const zhHK = JSON.parse(readFileSync(resolve(dir, "zh-HK.json"), "utf8"));
const en = JSON.parse(readFileSync(enPath, "utf8"));

const added = deepFillMissing(en, zhHK);
writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`, "utf8");
console.log(`✓ en.json: filled ${added} missing keys from zh-HK template`);

for (const locale of [
  "zh-CN",
  "de",
  "es",
  "fr",
  "ja",
  "ko",
  "pt",
  "th",
  "vi",
]) {
  const filePath = resolve(dir, `${locale}.json`);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  const localeAdded = deepFillMissing(data, en);
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json: filled ${localeAdded} missing keys from en`);
}

console.log("Done — i18n keys repaired");
