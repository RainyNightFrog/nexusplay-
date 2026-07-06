import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");

/** Keep in sync with lib/game-i18n.ts CATEGORY_MESSAGE_KEY */
const ALIAS_TAGS = {
  dim3d: "3D",
  dim2d: "2D",
  bit8: "8-bit",
  bit16: "16-bit",
};

const EN_LABELS = {
  全部: "All",
  動作: "Action",
  冒險: "Adventure",
  射擊: "Shooting",
  平台跳躍: "Platformer",
  格鬥: "Fighting",
  RPG: "RPG",
  策略: "Strategy",
  卡牌對戰: "Card Game",
  塔防: "Tower Defense",
  益智: "Puzzle",
  解謎: "Logic Puzzle",
  模擬: "Simulation",
  音樂節奏: "Rhythm",
  運動競技: "Sports",
  休閒: "Casual",
  恐怖: "Horror",
  文字冒險: "Text Adventure",
  沙盒: "Sandbox",
  賽博朋克: "Cyberpunk",
  蒸汽龐克: "Steampunk",
  奇幻: "Fantasy",
  科幻: "Sci-Fi",
  復古: "Retro",
  像素風: "Pixel Art",
  低多邊形: "Low Poly",
  手繪風: "Hand-drawn",
  寫實: "Realistic",
  卡通: "Cartoon",
  黑暗: "Dark",
  明亮: "Bright",
  極簡: "Minimalist",
  水墨風: "Ink Wash",
  賽璐珞: "Cel-shaded",
  厚塗: "Thick Paint",
  動漫風: "Anime",
  日系: "Japanese Style",
  歐美風: "Western Style",
  中式古風: "Chinese Classic",
  武俠: "Wuxia",
  神話: "Mythology",
  末日: "Post-apocalyptic",
  田園: "Pastoral",
  可愛: "Cute",
  哥德: "Gothic",
  機甲: "Mecha",
  霓虹: "Neon",
  向量風: "Vector Art",
  剪影: "Silhouette",
  水彩: "Watercolor",
  油畫風: "Oil Painting",
  黑白: "Black & White",
  黏土風: "Claymation",
  紙雕風: "Paper Craft",
  線條風: "Line Art",
  懷舊像素: "Retro Pixel",
  怪獸: "Kaiju",
  硬核: "Hardcore",
  Roguelike: "Roguelike",
  Roguelite: "Roguelite",
  自動化: "Automation",
  回合制: "Turn-based",
  即時戰略: "Real-time Strategy",
  放置: "Idle",
  沙盒建造: "Sandbox Building",
  開放世界: "Open World",
  線性劇情: "Linear Story",
  程序生成: "Procedural",
  生存: "Survival",
  建造: "Building",
  割草: "Horde Survivor",
  Meta: "Meta",
  解謎機制: "Puzzle Mechanics",
  卡牌構築: "Deck Building",
  塔防元素: "Tower Defense Elements",
  單機: "Singleplayer",
  多人對戰: "Multiplayer",
  合作: "Co-op",
  競技: "Competitive",
  本地多人: "Local Multiplayer",
  線上多人: "Online Multiplayer",
  觸控友善: "Touch Friendly",
  鍵鼠操作: "Keyboard & Mouse",
  手把支援: "Controller Support",
  橫向捲軸: "Side-scroller",
  俯視角: "Top-down",
  第一人稱: "First Person",
  第三人稱: "Third Person",
  WebGL: "WebGL",
  劇情豐富: "Story-rich",
  輕鬆治愈: "Relaxing",
  高難度: "High Difficulty",
  快節奏: "Fast-paced",
  慢節奏: "Slow-paced",
  恐怖氛圍: "Horror Atmosphere",
  搞笑: "Comedy",
  教育: "Educational",
  家庭向: "Family Friendly",
  戀愛: "Romance",
  百合: "Yuri",
  耽美: "BL",
  同人向: "Fan Work",
  dim3d: "3D",
  dim2d: "2D",
  bit8: "8-bit",
  bit16: "16-bit",
};

const ZH_CN_LABELS = {
  全部: "全部",
  動作: "动作",
  冒險: "冒险",
  射擊: "射击",
  平台跳躍: "平台跳跃",
  格鬥: "格斗",
  解謎: "解谜",
  音樂節奏: "音乐节奏",
  運動競技: "运动竞技",
  文字冒險: "文字冒险",
  沙盒: "沙盒",
  模擬: "模拟",
  休閒: "休闲",
  卡牌對戰: "卡牌对战",
  像素風: "像素风",
  自動化: "自动化",
  復古: "复古",
  多人對戰: "多人对战",
  單機: "单机",
  中式古風: "中式古风",
  懷舊像素: "怀旧像素",
  回合制: "回合制",
  即時戰略: "即时战略",
  沙盒建造: "沙盒建造",
  開放世界: "开放世界",
  線性劇情: "线性剧情",
  程序生成: "程序生成",
  解謎機制: "解谜机制",
  卡牌構築: "卡牌构筑",
  塔防元素: "塔防元素",
  本地多人: "本地多人",
  線上多人: "线上多人",
  觸控友善: "触控友好",
  鍵鼠操作: "键鼠操作",
  手把支援: "手柄支持",
  橫向捲軸: "横向卷轴",
  俯視角: "俯视角",
  第一人稱: "第一人称",
  第三人稱: "第三人称",
  劇情豐富: "剧情丰富",
  輕鬆治愈: "轻松治愈",
  高難度: "高难度",
  快節奏: "快节奏",
  慢節奏: "慢节奏",
  恐怖氛圍: "恐怖氛围",
  搞笑: "搞笑",
  家庭向: "家庭向",
  同人向: "同人向",
};

const ZH_HK_LABELS = {
  全部: "全部",
};

function buildCategoryLabels(locale) {
  if (locale === "en") {
    return { ...EN_LABELS };
  }

  const labels = {};
  for (const key of Object.keys(EN_LABELS)) {
    if (locale === "zh-CN") {
      labels[key] = ZH_CN_LABELS[key] ?? ALIAS_TAGS[key] ?? key;
    } else if (locale === "zh-HK") {
      labels[key] = ZH_HK_LABELS[key] ?? ALIAS_TAGS[key] ?? key;
    } else {
      labels[key] = EN_LABELS[key];
    }
  }
  return labels;
}

for (const locale of [
  "en",
  "zh-CN",
  "zh-HK",
  "es",
  "fr",
  "de",
  "pt",
  "th",
  "vi",
  "ko",
  "ja",
]) {
  const filePath = resolve(dir, `${locale}.json`);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  data.home.categories = buildCategoryLabels(locale);
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json`);
}
