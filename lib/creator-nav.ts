import { buildChooseRolePath } from "@/lib/account-intent";
import type { UserProfile } from "@/lib/auth";

export function getCreatorDashboardHref(
  profile: UserProfile | null,
  isCreator: boolean,
  target = "/dashboard"
) {
  if (!profile) {
    return `/auth?redirect=${encodeURIComponent(target)}&hint=creator`;
  }
  if (isCreator) {
    return target;
  }
  // 已選過玩家身分者仍可透過 switch=1 升級為創作者，避免 dashboard↔auth 迴圈
  return buildChooseRolePath(target, { allowSwitch: true });
}
