export type DevlogTemplateId =
  | "launch"
  | "majorUpdate"
  | "sale"
  | "bugfix"
  | "milestone";

export type DevlogTemplate = {
  id: DevlogTemplateId;
  titleKey: string;
  bodyKey: string;
};

export const DEVLOG_TEMPLATES: DevlogTemplate[] = [
  { id: "launch", titleKey: "devlogLaunchTitle", bodyKey: "devlogLaunchBody" },
  {
    id: "majorUpdate",
    titleKey: "devlogMajorUpdateTitle",
    bodyKey: "devlogMajorUpdateBody",
  },
  { id: "sale", titleKey: "devlogSaleTitle", bodyKey: "devlogSaleBody" },
  { id: "bugfix", titleKey: "devlogBugfixTitle", bodyKey: "devlogBugfixBody" },
  {
    id: "milestone",
    titleKey: "devlogMilestoneTitle",
    bodyKey: "devlogMilestoneBody",
  },
];

export type SdkCheckItemId =
  | "sdkScript"
  | "leaderboard"
  | "cloudSave"
  | "platformAuth"
  | "postMessage";

export type SdkCheckItem = {
  id: SdkCheckItemId;
  detected: boolean;
  optional?: boolean;
};

export function buildSdkChecklist(signals: string[]): SdkCheckItem[] {
  const has = (prefix: string) =>
    signals.some((signal) => signal.includes(prefix));

  return [
    { id: "sdkScript", detected: has("rnf") || has("sdk") },
    { id: "leaderboard", detected: has("leaderboard"), optional: true },
    { id: "cloudSave", detected: has("cloud"), optional: true },
    { id: "platformAuth", detected: has("platform"), optional: true },
    { id: "postMessage", detected: has("postmessage") || has("rnf") },
  ];
}
