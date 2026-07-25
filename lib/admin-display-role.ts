import type { EquippedTitle } from "@/lib/titles";

export type AdminDisplayRole = "none" | "admin" | "super_admin";

export const adminRoleRainbowTextClass =
  "supporter-username supporter-username-premium font-semibold";

/**
 * profiles.is_admin = 超級管理員；
 * app_metadata.role=admin = 服務層管理員（不可信 user_metadata）。
 */
export function resolveAdminDisplayRole(
  isAdminInDb: boolean,
  serviceRoleAdmin = false
): AdminDisplayRole {
  if (isAdminInDb) return "super_admin";
  if (serviceRoleAdmin) return "admin";
  return "none";
}

export function resolveChatAuthorRoleFallback(
  params: {
    equippedTitle: EquippedTitle | null | undefined;
    adminRole: AdminDisplayRole;
    isCreator: boolean;
  },
  labels: {
    superAdmin: string;
    admin: string;
    creator: string;
    player: string;
  }
): { label: string | null; rainbow: boolean } {
  if (params.equippedTitle) {
    return { label: null, rainbow: false };
  }
  if (params.adminRole === "super_admin") {
    return { label: labels.superAdmin, rainbow: true };
  }
  if (params.adminRole === "admin") {
    return { label: labels.admin, rainbow: true };
  }
  if (params.isCreator) {
    return { label: labels.creator, rainbow: false };
  }
  return { label: labels.player, rainbow: false };
}
