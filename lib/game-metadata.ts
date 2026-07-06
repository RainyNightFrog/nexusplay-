/** 2026 硬核電競系遊戲分類與標籤常數 */

export const GAME_GENRES = [
  "動作",
  "冒險",
  "射擊",
  "平台跳躍",
  "格鬥",
  "RPG",
  "策略",
  "卡牌對戰",
  "塔防",
  "益智",
  "解謎",
  "模擬",
  "音樂節奏",
  "運動競技",
  "休閒",
  "恐怖",
  "文字冒險",
  "沙盒",
] as const;

export type GameGenre = (typeof GAME_GENRES)[number];

export const GAME_TAGS = [
  "賽博朋克",
  "蒸汽龐克",
  "奇幻",
  "科幻",
  "復古",
  "像素風",
  "低多邊形",
  "手繪風",
  "寫實",
  "卡通",
  "黑暗",
  "明亮",
  "極簡",
  "水墨風",
  "賽璐珞",
  "厚塗",
  "動漫風",
  "日系",
  "歐美風",
  "中式古風",
  "武俠",
  "神話",
  "末日",
  "田園",
  "可愛",
  "哥德",
  "機甲",
  "霓虹",
  "向量風",
  "剪影",
  "水彩",
  "油畫風",
  "黑白",
  "8-bit",
  "16-bit",
  "黏土風",
  "紙雕風",
  "線條風",
  "懷舊像素",
  "怪獸",
  "硬核",
  "Roguelike",
  "Roguelite",
  "自動化",
  "回合制",
  "即時戰略",
  "放置",
  "沙盒建造",
  "開放世界",
  "線性劇情",
  "程序生成",
  "生存",
  "建造",
  "割草",
  "Meta",
  "解謎機制",
  "卡牌構築",
  "塔防元素",
  "單機",
  "多人對戰",
  "合作",
  "競技",
  "本地多人",
  "線上多人",
  "觸控友善",
  "鍵鼠操作",
  "手把支援",
  "2D",
  "3D",
  "橫向捲軸",
  "俯視角",
  "第一人稱",
  "第三人稱",
  "WebGL",
  "劇情豐富",
  "輕鬆治愈",
  "高難度",
  "快節奏",
  "慢節奏",
  "恐怖氛圍",
  "搞笑",
  "教育",
  "家庭向",
  "戀愛",
  "百合",
  "耽美",
  "同人向",
] as const;

export type GameTag = (typeof GAME_TAGS)[number];

export const GAME_TAG_GROUPS: ReadonlyArray<{
  label: string;
  tags: readonly GameTag[];
}> = [
  {
    label: "美術風格",
    tags: [
      "賽博朋克",
      "蒸汽龐克",
      "奇幻",
      "科幻",
      "復古",
      "像素風",
      "低多邊形",
      "手繪風",
      "寫實",
      "卡通",
      "黑暗",
      "明亮",
      "極簡",
      "水墨風",
      "賽璐珞",
      "厚塗",
      "動漫風",
      "日系",
      "歐美風",
      "中式古風",
      "武俠",
      "神話",
      "末日",
      "田園",
      "可愛",
      "哥德",
      "機甲",
      "霓虹",
      "向量風",
      "剪影",
      "水彩",
      "油畫風",
      "黑白",
      "8-bit",
      "16-bit",
      "黏土風",
      "紙雕風",
      "線條風",
      "懷舊像素",
      "怪獸",
    ],
  },
  {
    label: "玩法機制",
    tags: [
      "硬核",
      "Roguelike",
      "Roguelite",
      "自動化",
      "回合制",
      "即時戰略",
      "放置",
      "沙盒建造",
      "開放世界",
      "線性劇情",
      "程序生成",
      "生存",
      "建造",
      "割草",
      "Meta",
      "解謎機制",
      "卡牌構築",
      "塔防元素",
    ],
  },
  {
    label: "遊玩方式",
    tags: [
      "單機",
      "多人對戰",
      "合作",
      "競技",
      "本地多人",
      "線上多人",
      "觸控友善",
      "鍵鼠操作",
      "手把支援",
    ],
  },
  {
    label: "視角與維度",
    tags: [
      "2D",
      "3D",
      "橫向捲軸",
      "俯視角",
      "第一人稱",
      "第三人稱",
      "WebGL",
    ],
  },
  {
    label: "氛圍與受眾",
    tags: [
      "劇情豐富",
      "輕鬆治愈",
      "高難度",
      "快節奏",
      "慢節奏",
      "恐怖氛圍",
      "搞笑",
      "教育",
      "家庭向",
      "戀愛",
      "百合",
      "耽美",
      "同人向",
    ],
  },
];

export const AI_CONTENT_TYPES = [
  "graphics",
  "sound",
  "text",
  "code",
] as const;

export type AiContentType = (typeof AI_CONTENT_TYPES)[number];

export const AI_CONTENT_TYPE_LABELS: Record<AiContentType, string> = {
  graphics: "美術/圖像",
  sound: "聲音/音樂",
  text: "文字/對話",
  code: "程式碼",
};

export const MAX_GAME_TAGS = 10;
export const MAX_DETAILS_HTML_LENGTH = 50_000;

export const DEFAULT_VIEWPORT_WIDTH = 960;
export const DEFAULT_VIEWPORT_HEIGHT = 600;

export const MIN_VIEWPORT = 200;
export const MAX_VIEWPORT_WIDTH = 3840;
export const MAX_VIEWPORT_HEIGHT = 2160;

export type GamePublishMetadata = {
  tags: string[];
  viewportWidth: number;
  viewportHeight: number;
  fullscreenButton: boolean;
  aiDisclosed: boolean | null;
  aiContentTypes: AiContentType[];
  detailsHtml: string;
};

export const DEFAULT_GAME_PUBLISH_METADATA: GamePublishMetadata = {
  tags: [],
  viewportWidth: DEFAULT_VIEWPORT_WIDTH,
  viewportHeight: DEFAULT_VIEWPORT_HEIGHT,
  fullscreenButton: true,
  aiDisclosed: null,
  aiContentTypes: [],
  detailsHtml: "",
};

function parseJsonArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseTags(raw: string): string[] {
  const items = parseJsonArray(raw)
    .map((item) => String(item).trim())
    .filter(Boolean);

  const valid = items.filter((item): item is GameTag =>
    (GAME_TAGS as readonly string[]).includes(item)
  );

  return [...new Set(valid)].slice(0, MAX_GAME_TAGS);
}

function parseAiContentTypes(raw: string): AiContentType[] {
  const items = parseJsonArray(raw)
    .map((item) => String(item).trim())
    .filter(Boolean);

  return [...new Set(items)].filter((item): item is AiContentType =>
    (AI_CONTENT_TYPES as readonly string[]).includes(item)
  ) as AiContentType[];
}

function parseViewportDimension(
  raw: FormDataEntryValue | null,
  fallback: number,
  min: number,
  max: number
): number {
  const value = Number.parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function parseAiDisclosed(raw: FormDataEntryValue | null): boolean | null {
  const value = String(raw ?? "").trim();
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function parsePublishMetadataFromFormData(
  formData: FormData
): { ok: true; data: GamePublishMetadata } | { ok: false; error: string } {
  const tags = parseTags(String(formData.get("tags") ?? "[]"));
  const viewportWidth = parseViewportDimension(
    formData.get("viewportWidth"),
    DEFAULT_VIEWPORT_WIDTH,
    MIN_VIEWPORT,
    MAX_VIEWPORT_WIDTH
  );
  const viewportHeight = parseViewportDimension(
    formData.get("viewportHeight"),
    DEFAULT_VIEWPORT_HEIGHT,
    MIN_VIEWPORT,
    MAX_VIEWPORT_HEIGHT
  );
  const fullscreenButton =
    String(formData.get("fullscreenButton") ?? "true") === "true";
  const aiDisclosed = parseAiDisclosed(formData.get("aiDisclosed"));
  let aiContentTypes = parseAiContentTypes(
    String(formData.get("aiContentTypes") ?? "[]")
  );

  if (aiDisclosed === true && aiContentTypes.length === 0) {
    return {
      ok: false,
      error: "選擇「包含 AI 生成內容」時，請至少勾選一項 AI 內容類型",
    };
  }

  if (aiDisclosed !== true) {
    aiContentTypes = [];
  }

  const detailsHtml = String(formData.get("detailsHtml") ?? "");

  if (detailsHtml.length > MAX_DETAILS_HTML_LENGTH) {
    return {
      ok: false,
      error: `詳細介紹不可超過 ${MAX_DETAILS_HTML_LENGTH} 字元`,
    };
  }

  return {
    ok: true,
    data: {
      tags,
      viewportWidth,
      viewportHeight,
      fullscreenButton,
      aiDisclosed,
      aiContentTypes,
      detailsHtml,
    },
  };
}

export function appendPublishMetadataToFormData(
  formData: FormData,
  metadata: GamePublishMetadata
) {
  formData.append("tags", JSON.stringify(metadata.tags));
  formData.append("viewportWidth", String(metadata.viewportWidth));
  formData.append("viewportHeight", String(metadata.viewportHeight));
  formData.append("fullscreenButton", String(metadata.fullscreenButton));
  formData.append(
    "aiDisclosed",
    metadata.aiDisclosed === true
      ? "yes"
      : metadata.aiDisclosed === false
        ? "no"
        : ""
  );
  formData.append("aiContentTypes", JSON.stringify(metadata.aiContentTypes));
  formData.append("detailsHtml", metadata.detailsHtml);
}

export function metadataFromGameRecord(record: {
  tags?: unknown;
  viewport_width?: number;
  viewport_height?: number;
  fullscreen_button?: boolean;
  ai_disclosed?: boolean | null;
  ai_content_types?: unknown;
  details_html?: string;
}): GamePublishMetadata {
  const rawTags = Array.isArray(record.tags)
    ? record.tags.map(String)
    : [];

  return {
    tags: rawTags.filter((tag): tag is GameTag =>
      (GAME_TAGS as readonly string[]).includes(tag)
    ),
    viewportWidth: record.viewport_width ?? DEFAULT_VIEWPORT_WIDTH,
    viewportHeight: record.viewport_height ?? DEFAULT_VIEWPORT_HEIGHT,
    fullscreenButton: record.fullscreen_button ?? true,
    aiDisclosed:
      record.ai_disclosed === true || record.ai_disclosed === false
        ? record.ai_disclosed
        : null,
    aiContentTypes: (
      Array.isArray(record.ai_content_types)
        ? record.ai_content_types.map(String)
        : []
    ).filter((item): item is AiContentType =>
      (AI_CONTENT_TYPES as readonly string[]).includes(item)
    ),
    detailsHtml: record.details_html ?? "",
  };
}

export function buildMetadataDbPayload(metadata: GamePublishMetadata) {
  return {
    tags: metadata.tags,
    viewport_width: metadata.viewportWidth,
    viewport_height: metadata.viewportHeight,
    fullscreen_button: metadata.fullscreenButton,
    ai_disclosed: metadata.aiDisclosed,
    ai_content_types: metadata.aiContentTypes,
    details_html: metadata.detailsHtml,
  };
}
