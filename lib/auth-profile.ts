import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import {
  getEquippedCosmetics,
  resolveCosmeticCssByCodes,
} from "@/lib/ap-shop-service";
import { resolveEquippedTitleForUser } from "@/lib/equipped-title-service";
import { profileFromUserMetadata } from "@/lib/profile-from-metadata";
import { isMissingProfilesRelation } from "@/lib/profiles-access";
import { resolveRoleFromPreferences } from "@/lib/profile-settings";
import { createServerSupabase } from "@/lib/supabase-server";

export { profileFromUserMetadata } from "@/lib/profile-from-metadata";

function normalizeRole(value: unknown): UserRole {
  return value === "creator" ? "creator" : "player";
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** authenticated SELECT 已授權欄位（不含 is_admin／外觀／supporter_since） */
const SELECT_AUTH_GRANTED =
  "id, display_name, avatar_url, role, created_at, support_email, equipped_title_id, bio, player_number, is_supporter, supporter_badge, supporter_lifetime, username";

/** service role 完整讀取（含玩家應可見但 hardening 未授權給 client 的欄位） */
const SELECT_FULL =
  "id, display_name, avatar_url, role, created_at, support_email, equipped_title_id, bio, player_number, is_supporter, supporter_since, supporter_badge, supporter_lifetime, username, is_admin, equipped_avatar_frame, equipped_name_color, equipped_chat_bubble";

async function loadProfileRow(
  authClient: SupabaseClient,
  userId: string
): Promise<{
  profile: Record<string, unknown> | null;
  error: { code?: string; message?: string } | null;
  reader: SupabaseClient;
}> {
  // 優先用 service role，避免 auth client 因欄位未授權而整段 SELECT 失敗、回退 metadata
  try {
    const admin = createServerSupabase();
    const result = await admin
      .from("profiles")
      .select(SELECT_FULL)
      .eq("id", userId)
      .maybeSingle();

    if (!result.error) {
      return {
        profile: result.data as Record<string, unknown> | null,
        error: null,
        reader: admin,
      };
    }

    if (!isMissingProfilesRelation(result.error)) {
      // 欄位尚未 migration 時，退回授權欄位查詢
      if (
        result.error.message?.includes("column") ||
        result.error.message?.includes("equipped_") ||
        result.error.message?.includes("supporter_") ||
        result.error.message?.includes("is_admin")
      ) {
        const fallback = await admin
          .from("profiles")
          .select(SELECT_AUTH_GRANTED)
          .eq("id", userId)
          .maybeSingle();
        if (!fallback.error) {
          return {
            profile: fallback.data as Record<string, unknown> | null,
            error: null,
            reader: admin,
          };
        }
      }
    }
  } catch {
    /* 無 service key 時改走 auth client */
  }

  const granted = await authClient
    .from("profiles")
    .select(SELECT_AUTH_GRANTED)
    .eq("id", userId)
    .maybeSingle();

  return {
    profile: granted.data as Record<string, unknown> | null,
    error: granted.error,
    reader: authClient,
  };
}

export async function resolveUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<UserProfile> {
  const metadataProfile = profileFromUserMetadata(user);

  const { profile, error, reader } = await loadProfileRow(supabase, user.id);

  if (!error && profile) {
    const dbIsAdmin = profile.is_admin === true;
    const isAdmin =
      isAdminUser(user) || metadataProfile.is_admin === true || dbIsAdmin;
    const developingGames =
      metadataProfile.developing_games ||
      normalizeRole(profile.role) === "creator" ||
      isAdmin;
    const equippedTitleId =
      typeof profile.equipped_title_id === "string"
        ? profile.equipped_title_id
        : null;
    const equippedTitle = equippedTitleId
      ? await resolveEquippedTitleForUser(reader, user.id)
      : null;

    let cosmetics = {
      avatar_frame: readOptionalString(profile.equipped_avatar_frame),
      name_color: readOptionalString(profile.equipped_name_color),
      chat_bubble: readOptionalString(profile.equipped_chat_bubble),
    };
    if (
      !cosmetics.avatar_frame &&
      !cosmetics.name_color &&
      !cosmetics.chat_bubble
    ) {
      try {
        cosmetics = await getEquippedCosmetics(reader, user.id);
      } catch {
        /* ignore missing columns */
      }
    }

    const cssMap = await resolveCosmeticCssByCodes(reader, [
      cosmetics.avatar_frame ?? "",
      cosmetics.name_color ?? "",
      cosmetics.chat_bubble ?? "",
    ]);

    return {
      ...metadataProfile,
      player_number:
        typeof profile.player_number === "number"
          ? profile.player_number
          : profile.player_number != null
            ? Number(profile.player_number) || null
            : null,
      display_name:
        (typeof profile.display_name === "string" && profile.display_name) ||
        metadataProfile.display_name,
      username: readOptionalString(profile.username),
      avatar_url:
        (typeof profile.avatar_url === "string" ? profile.avatar_url : null) ??
        metadataProfile.avatar_url,
      role: resolveRoleFromPreferences(developingGames),
      is_admin: isAdmin,
      created_at:
        (typeof profile.created_at === "string" && profile.created_at) ||
        metadataProfile.created_at,
      developing_games: developingGames,
      support_email: readOptionalString(profile.support_email),
      bio: readOptionalString(profile.bio) ?? metadataProfile.bio,
      equipped_title_id: equippedTitleId,
      equipped_title: equippedTitle,
      equipped_avatar_frame: cosmetics.avatar_frame,
      equipped_name_color: cosmetics.name_color,
      equipped_chat_bubble: cosmetics.chat_bubble,
      equipped_avatar_frame_class: cosmetics.avatar_frame
        ? (cssMap.get(cosmetics.avatar_frame) ?? null)
        : null,
      equipped_name_color_class: cosmetics.name_color
        ? (cssMap.get(cosmetics.name_color) ?? null)
        : null,
      equipped_chat_bubble_class: cosmetics.chat_bubble
        ? (cssMap.get(cosmetics.chat_bubble) ?? null)
        : null,
      is_supporter: profile.is_supporter === true,
      supporter_since: readOptionalString(profile.supporter_since),
      supporter_badge: readOptionalString(profile.supporter_badge),
      supporter_lifetime: profile.supporter_lifetime === true,
    };
  }

  if (error && !isMissingProfilesRelation(error)) {
    throw new Error(error.message);
  }

  return metadataProfile;
}

export async function resolveUserRole(
  supabase: SupabaseClient,
  user: User
): Promise<UserRole> {
  const profile = await resolveUserProfile(supabase, user);
  return profile.role;
}

/** 創作者後台與上傳 API：創作者或超級管理員皆可 */
export function hasCreatorDashboardAccess(
  user: User,
  role: UserRole,
  isAdminFlag = false
): boolean {
  return isAdminUser(user) || isAdminFlag === true || role === "creator";
}
