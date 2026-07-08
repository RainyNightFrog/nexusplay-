import type { PublishMonetizationValues } from "@/components/dashboard/publish-monetization-fields";
import {
  AI_CONTENT_TYPES,
  DEFAULT_GAME_PUBLISH_METADATA,
  GAME_GENRES,
  GAME_TAGS,
  type GameGenre,
  type GamePublishMetadata,
} from "@/lib/game-metadata";
import { DEFAULT_PUBLISH_STATUS, normalizePublishStatus } from "@/lib/game-publish";

const EDIT_DRAFT_PREFIX = "rainynightfrog-game-edit-draft:";
const LEGACY_EDIT_DRAFT_PREFIX = "nexusplay-game-edit-draft:";
const UPLOAD_DRAFT_KEY = "rainynightfrog-game-upload-draft";
const LEGACY_UPLOAD_DRAFT_KEY = "nexusplay-game-upload-draft";

export type PersistedGameFormState = {
  title: string;
  description: string;
  genre: GameGenre | "";
};

export type GameFormDraftPayload = {
  form: PersistedGameFormState;
  metadata: GamePublishMetadata;
  monetization: PublishMonetizationValues;
  existingGalleryUrls?: string[];
  devlogTitle?: string;
  devlogContent?: string;
  savedAt?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseGenre(value: unknown): GameGenre | "" {
  const genre = String(value ?? "").trim();
  return (GAME_GENRES as readonly string[]).includes(genre)
    ? (genre as GameGenre)
    : "";
}

function parseMetadata(value: unknown): GamePublishMetadata {
  if (!isRecord(value)) {
    return { ...DEFAULT_GAME_PUBLISH_METADATA };
  }

  const rawTags = Array.isArray(value.tags)
    ? value.tags.map(String).filter(Boolean)
    : [];
  const tags = rawTags.filter((tag): tag is (typeof GAME_TAGS)[number] =>
    (GAME_TAGS as readonly string[]).includes(tag)
  );

  const rawAiTypes = Array.isArray(value.aiContentTypes)
    ? value.aiContentTypes.map(String)
    : [];
  const aiContentTypes = rawAiTypes.filter(
    (item): item is (typeof AI_CONTENT_TYPES)[number] =>
      (AI_CONTENT_TYPES as readonly string[]).includes(item)
  );

  const aiDisclosed =
    value.aiDisclosed === true || value.aiDisclosed === false
      ? value.aiDisclosed
      : null;

  const viewportWidth =
    typeof value.viewportWidth === "number" && Number.isFinite(value.viewportWidth)
      ? value.viewportWidth
      : DEFAULT_GAME_PUBLISH_METADATA.viewportWidth;
  const viewportHeight =
    typeof value.viewportHeight === "number" && Number.isFinite(value.viewportHeight)
      ? value.viewportHeight
      : DEFAULT_GAME_PUBLISH_METADATA.viewportHeight;

  return {
    tags,
    viewportWidth,
    viewportHeight,
    fullscreenButton:
      typeof value.fullscreenButton === "boolean"
        ? value.fullscreenButton
        : DEFAULT_GAME_PUBLISH_METADATA.fullscreenButton,
    aiDisclosed,
    aiContentTypes,
    detailsHtml:
      typeof value.detailsHtml === "string" ? value.detailsHtml : "",
  };
}

function parseMonetization(value: unknown): PublishMonetizationValues {
  if (!isRecord(value)) {
    return {
      publishStatus: DEFAULT_PUBLISH_STATUS,
      tipsEnabled: false,
      suggestedTipAmount: "",
    };
  }

  return {
    publishStatus: normalizePublishStatus(
      typeof value.publishStatus === "string" ? value.publishStatus : undefined
    ),
    tipsEnabled: value.tipsEnabled === true,
    suggestedTipAmount:
      typeof value.suggestedTipAmount === "string"
        ? value.suggestedTipAmount
        : "",
  };
}

function parseForm(value: unknown): PersistedGameFormState {
  if (!isRecord(value)) {
    return { title: "", description: "", genre: "" };
  }

  return {
    title: typeof value.title === "string" ? value.title : "",
    description: typeof value.description === "string" ? value.description : "",
    genre: parseGenre(value.genre),
  };
}

function parseDraft(raw: unknown): GameFormDraftPayload | null {
  if (!isRecord(raw)) return null;

  const form = parseForm(raw.form);
  const metadata = parseMetadata(raw.metadata);
  const monetization = parseMonetization(raw.monetization);

  const existingGalleryUrls = Array.isArray(raw.existingGalleryUrls)
    ? raw.existingGalleryUrls
        .map(String)
        .filter((url) => url.startsWith("http"))
    : undefined;

  return {
    form,
    metadata,
    monetization,
    existingGalleryUrls,
    devlogTitle:
      typeof raw.devlogTitle === "string" ? raw.devlogTitle : undefined,
    devlogContent:
      typeof raw.devlogContent === "string" ? raw.devlogContent : undefined,
    savedAt: typeof raw.savedAt === "number" ? raw.savedAt : undefined,
  };
}

function readDraft(storageKey: string, legacyKey?: string): GameFormDraftPayload | null {
  if (typeof window === "undefined") return null;

  try {
    let raw = window.localStorage.getItem(storageKey);
    if (!raw && legacyKey) {
      raw = window.localStorage.getItem(legacyKey);
      if (raw) {
        window.localStorage.setItem(storageKey, raw);
        window.localStorage.removeItem(legacyKey);
      }
    }
    if (!raw) return null;
    return parseDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeDraft(storageKey: string, draft: GameFormDraftPayload) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

function clearDraft(storageKey: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

export function editDraftKey(gameId: number) {
  return `${EDIT_DRAFT_PREFIX}${gameId}`;
}

function legacyEditDraftKey(gameId: number) {
  return `${LEGACY_EDIT_DRAFT_PREFIX}${gameId}`;
}

export function readGameEditDraft(gameId: number) {
  return readDraft(editDraftKey(gameId), legacyEditDraftKey(gameId));
}

export function writeGameEditDraft(
  gameId: number,
  draft: Omit<GameFormDraftPayload, "savedAt">
) {
  writeDraft(editDraftKey(gameId), draft);
}

export function clearGameEditDraft(gameId: number) {
  clearDraft(editDraftKey(gameId));
}

export function readGameUploadDraft() {
  return readDraft(UPLOAD_DRAFT_KEY, LEGACY_UPLOAD_DRAFT_KEY);
}

export function writeGameUploadDraft(
  draft: Omit<GameFormDraftPayload, "savedAt" | "existingGalleryUrls">
) {
  writeDraft(UPLOAD_DRAFT_KEY, draft);
}

export function clearGameUploadDraft() {
  clearDraft(UPLOAD_DRAFT_KEY);
}
