import { getPlatformGameMeta } from "@/lib/platform-catalog";
import { normalizeAppAssetUrl } from "@/lib/site-url";
import type { GameRecord } from "@/lib/supabase";

export type GameDevlogEntry = {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  createdAt: string;
};

export type GameComment = {
  id: number;
  game_id: number;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_equipped_title: import("@/lib/titles").EquippedTitle | null;
  author_is_supporter?: boolean;
};

export type SeedGameComment = {
  authorName: string;
  content: string;
  offsetHours: number;
};

const VALID_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const VALID_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export const MAX_GALLERY_IMAGES = 8;
export const MAX_DEVLOG_IMAGES = 4;
export const MAX_DEVLOG_TITLE_LENGTH = 120;
export const MAX_DEVLOG_CONTENT_LENGTH = 4000;
export const MAX_COMMENT_LENGTH = 1000;

function resolveAssetUrl(url: string) {
  return normalizeAppAssetUrl(url);
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function parseDevlogEntries(value: unknown): GameDevlogEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title : "";
      const content = typeof row.content === "string" ? row.content : "";
      const createdAt =
        typeof row.createdAt === "string"
          ? row.createdAt
          : typeof row.created_at === "string"
            ? row.created_at
            : new Date().toISOString();
      const id =
        typeof row.id === "string"
          ? row.id
          : crypto.randomUUID();
      const imageUrls = parseStringArray(row.imageUrls ?? row.image_urls).map(
        resolveAssetUrl
      );

      if (!title && !content && imageUrls.length === 0) return null;

      return {
        id,
        title,
        content,
        imageUrls,
        createdAt,
      } satisfies GameDevlogEntry;
    })
    .filter((entry): entry is GameDevlogEntry => entry !== null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function resolveGalleryUrls(
  record: Pick<GameRecord, "title" | "cover_url"> & {
    gallery_urls?: unknown;
  }
): string[] {
  const fromDb = parseStringArray(record.gallery_urls).map(resolveAssetUrl);
  if (fromDb.length > 0) return fromDb;

  const meta = getPlatformGameMeta(record.title);
  if (meta?.galleryImages?.length) {
    return meta.galleryImages.map(resolveAssetUrl);
  }

  const cover = resolveAssetUrl(record.cover_url || meta?.coverPath || "");
  return cover ? [cover] : [];
}

export function resolveDevlogEntries(
  record: Pick<GameRecord, "title"> & { devlog_entries?: unknown }
): GameDevlogEntry[] {
  const fromDb = parseDevlogEntries(record.devlog_entries);
  if (fromDb.length > 0) return fromDb;

  const meta = getPlatformGameMeta(record.title);
  if (!meta?.devlogs?.length) return [];

  const now = Date.now();
  return meta.devlogs.map((entry, index) => ({
    id: `seed-${record.title}-${index}`,
    title: entry.title,
    content: entry.content,
    imageUrls: (entry.imageUrls ?? []).map(resolveAssetUrl),
    createdAt: new Date(now - entry.createdAtOffsetDays * 86_400_000).toISOString(),
  }));
}

export function appendDevlogEntry(
  existing: unknown,
  entry: Omit<GameDevlogEntry, "id"> & { id?: string }
): GameDevlogEntry[] {
  const parsed = parseDevlogEntries(existing);
  const nextEntry: GameDevlogEntry = {
    id: entry.id ?? crypto.randomUUID(),
    title: entry.title,
    content: entry.content,
    imageUrls: entry.imageUrls,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
  return [nextEntry, ...parsed];
}

export function mergeGalleryUrls(
  keptUrls: string[],
  uploadedUrls: string[]
): string[] {
  const merged = [...keptUrls, ...uploadedUrls];
  return merged.slice(0, MAX_GALLERY_IMAGES);
}

export function isValidGalleryImage(file: File) {
  if (VALID_IMAGE_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function collectGalleryFiles(formData: FormData) {
  return formData
    .getAll("galleryImages")
    .filter((item): item is File => item instanceof File && item.size > 0);
}

export function collectDevlogImageFiles(formData: FormData) {
  return formData
    .getAll("devlogImages")
    .filter((item): item is File => item instanceof File && item.size > 0);
}

export function parseGalleryUrlsField(formData: FormData) {
  const raw = String(formData.get("galleryUrls") ?? "[]");
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseStringArray(parsed);
  } catch {
    return [];
  }
}
