import type { EquippedTitle } from "@/lib/titles";

export type AdminDisplayRole = "none" | "admin" | "super_admin";

export const adminRoleRainbowTextClass =
  "supporter-username supporter-username-premium font-semibold";

/** profiles.is_admin 為超級管理員；僅 JWT metadata role=admin 為一般管理員 */
export function resolveAdminDisplayRole(
  isAdminInDb: boolean,
  metadataRoleAdmin: boolean
): AdminDisplayRole {
  if (isAdminInDb) return "super_admin";
  if (metadataRoleAdmin) return "admin";
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
