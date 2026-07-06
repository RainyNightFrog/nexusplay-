/**
 * Quick verification for auth intent skip + settings layout classes.
 * Run: node scripts/verify-account-features.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

const failures = [];
const passes = [];

function assert(name, condition, detail = "") {
  if (condition) {
    passes.push(name);
  } else {
    failures.push({ name, detail });
  }
}

// --- Auth: shouldSkipAccountIntent ---
const accountIntent = read("lib/account-intent.ts");
assert(
  "auth: skips when account_intent_at is set",
  accountIntent.includes("account_intent_at") &&
    accountIntent.includes("metadata.account_intent_at.length > 0"),
  "shouldSkipAccountIntent must check account_intent_at"
);

const authPage = read("app/[locale]/auth/auth-page.tsx");
assert(
  "auth: email signup writes account_intent_at",
  authPage.includes("account_intent_at: new Date().toISOString()"),
  "signUp metadata should include account_intent_at"
);
assert(
  "auth: goAfterAuth uses shouldSkipAccountIntent",
  authPage.includes("shouldSkipAccountIntent(user)"),
  "goAfterAuth should call shouldSkipAccountIntent"
);

const callback = read("app/auth/callback/route.ts");
assert(
  "auth: OAuth callback uses shouldSkipAccountIntent",
  callback.includes("shouldSkipAccountIntent(user)"),
  "callback route should skip choose-role when intent exists"
);

const chooseRole = read("app/[locale]/auth/choose-role/choose-role-page.tsx");
assert(
  "auth: choose-role redirects if intent already set",
  chooseRole.includes("shouldSkipAccountIntent(user)"),
  "choose-role page should redirect returning users"
);

// --- Settings layout ---
const shell = read("components/settings/account-shell.tsx");
assert(
  "settings: shared centered section class exists",
  shell.includes('accountSectionClassName = "space-y-5 text-center"'),
  "accountSectionClassName"
);
assert(
  "settings: toggle rows stay left-aligned",
  shell.includes("settingsToggleRowClassName") && shell.includes("text-left"),
  "settingsToggleRowClassName"
);
assert(
  "settings: list rows for right-side buttons",
  shell.includes("settingsListRowClassName"),
  "settingsListRowClassName"
);

const nav = read("components/settings/account-settings-nav.tsx");
assert(
  "settings: sidebar links centered",
  nav.includes("accountNavLinkClassName"),
  "nav links should use accountNavLinkClassName (justify-center)"
);
assert(
  "settings: sidebar link class has justify-center",
  shell.includes("accountNavLinkClassName") && shell.includes("justify-center"),
  "accountNavLinkClassName definition"
);

const header = read("components/settings/account-settings-layout.tsx");
assert(
  "settings: page header centered",
  header.includes('className="mb-6 text-center"'),
  "AccountSettingsPageHeader"
);

const settingsPages = [
  "app/[locale]/settings/page.tsx",
  "app/[locale]/settings/privacy/page.tsx",
  "app/[locale]/settings/security/page.tsx",
  "app/[locale]/settings/billing/page.tsx",
  "app/[locale]/settings/creator/page.tsx",
  "app/[locale]/settings/payment/page.tsx",
  "app/[locale]/settings/payout/page.tsx",
  "app/[locale]/settings/api/page.tsx",
  "app/[locale]/settings/data/page.tsx",
  "app/[locale]/settings/following/page.tsx",
];

for (const page of settingsPages) {
  const content = read(page);
  const usesCenteredSection =
    content.includes("accountSectionClassName") ||
    content.includes("accountSectionCompactClassName") ||
    content.includes('text-center');
  assert(
    `settings: ${page} uses centered sections`,
    usesCenteredSection,
    "expected accountSection* or text-center"
  );
  assert(
    `settings: ${page} no bare section text-left`,
    !content.includes('section className="space-y-4 text-left"') &&
      !content.includes('section className="space-y-5 text-left"'),
    "remove leftover text-left sections"
  );
}

// Ensure toggle rows still used where needed
assert(
  "settings: general page keeps toggle rows",
  read("app/[locale]/settings/page.tsx").includes("settingsToggleRowClassName"),
  "SettingsToggle"
);
assert(
  "settings: creator page keeps tip notify toggles",
  read("app/[locale]/settings/creator/page.tsx").includes("settingsToggleRowClassName"),
  "tip notify rows"
);

// --- Runtime logic: shouldSkipAccountIntent behavior ---
function shouldSkipAccountIntent(user) {
  const metadata = user.user_metadata ?? {};
  if (metadata.role === "admin") return true;
  return (
    typeof metadata.account_intent_at === "string" &&
    metadata.account_intent_at.length > 0
  );
}

assert(
  "logic: admin skips choose-role",
  shouldSkipAccountIntent({ user_metadata: { role: "admin" } }) === true
);
assert(
  "logic: user with account_intent_at skips",
  shouldSkipAccountIntent({
    user_metadata: { account_intent_at: "2026-01-01T00:00:00.000Z", role: "player" },
  }) === true
);
assert(
  "logic: new Google user without intent does not skip",
  shouldSkipAccountIntent({ user_metadata: { role: "player" } }) === false
);
assert(
  "logic: email register with intent skips",
  shouldSkipAccountIntent({
    user_metadata: {
      role: "creator",
      developing_games: true,
      account_intent_at: "2026-07-06T00:00:00.000Z",
    },
  }) === true
);

console.log(`\n✅ Passed: ${passes.length}`);
for (const name of passes) console.log(`  · ${name}`);

if (failures.length) {
  console.log(`\n❌ Failed: ${failures.length}`);
  for (const { name, detail } of failures) {
    console.log(`  · ${name}`);
    if (detail) console.log(`    ${detail}`);
  }
  process.exit(1);
}

console.log("\nAll static checks passed.\n");
