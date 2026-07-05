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
  return `/auth/choose-role?redirect=${encodeURIComponent(target)}`;
}
