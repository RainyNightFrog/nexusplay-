import type { VirtualPlayerLocale } from "@/lib/virtual-players";

export type AmbientChatSingle = {
  locale: VirtualPlayerLocale;
  content: string;
};

export type AmbientChatDialogue = {
  locale: VirtualPlayerLocale;
  lines: [string, string];
};

/** 單句：口語、可讀、像真人在世界頻道隨口說的 */
export const AMBIENT_CHAT_SINGLES: AmbientChatSingle[] = [
  // zh-HK
  { locale: "zh-HK", content: "有人玩緊 void gacha 嗎" },
  { locale: "zh-HK", content: "剛剛抽咗十連 得一件藍 心態崩" },
  { locale: "zh-HK", content: "個塔防第八波點先升級好啲" },
  { locale: "zh-HK", content: "今晚邊個開黑" },
  { locale: "zh-HK", content: "neon runner 個 boss 雷射好難躲" },
  { locale: "zh-HK", content: "登入咗先可以上傳分數架" },
  { locale: "zh-HK", content: "cyber fortune 配對有時要等幾分鐘" },
  { locale: "zh-HK", content: "個站載入幾快 唔錯" },
  { locale: "zh-HK", content: "有冇人知打賞點開" },
  { locale: "zh-HK", content: "signal breach 第六關開始好燒腦" },
  { locale: "zh-HK", content: "剛註冊 介面幾順" },
  { locale: "zh-HK", content: "節奏遊戲 fever 模式好爽" },
  { locale: "zh-HK", content: "卡牌那個 roguelike 打咗成晚" },
  { locale: "zh-HK", content: "邊度改頭像" },
  { locale: "zh-HK", content: "論壇個 bug 回報有人理嗎" },
  // zh-CN
  { locale: "zh-CN", content: "有人在吗" },
  { locale: "zh-CN", content: "刚打完一把塔防 手都酸了" },
  { locale: "zh-CN", content: "void gacha 这关打了半小时" },
  { locale: "zh-CN", content: "十连全是白的 服了" },
  { locale: "zh-CN", content: "这网站加载还挺快" },
  { locale: "zh-CN", content: "跑酷那个冲刺冷却好难抓" },
  { locale: "zh-CN", content: "有没有人玩赛博扑克" },
  { locale: "zh-CN", content: "打赏功能开了没" },
  { locale: "zh-CN", content: "排行榜要登录才上传吧" },
  { locale: "zh-CN", content: "刚发现可以收藏游戏" },
  { locale: "zh-CN", content: "卡牌游戏第三层boss好难" },
  { locale: "zh-CN", content: "论坛怎么发帖啊" },
  { locale: "zh-CN", content: "夜里人好像多一点" },
  { locale: "zh-CN", content: "黑客那个倒数好紧张" },
  { locale: "zh-CN", content: "有人一起刷分吗" },
  // en
  { locale: "en", content: "anyone playing void runner rn" },
  { locale: "en", content: "just got wrecked on wave 12 lol" },
  { locale: "en", content: "tower defense wave 8 is no joke" },
  { locale: "en", content: "is tipping actually live or preview" },
  { locale: "en", content: "site loads pretty fast ngl" },
  { locale: "en", content: "how do you upload to leaderboard" },
  { locale: "en", content: "cyber fortune matchmaking slow tonight" },
  { locale: "en", content: "card roguelike is addictive" },
  { locale: "en", content: "need login for scores right" },
  { locale: "en", content: "rhythm game fever mode goes hard" },
  { locale: "en", content: "anyone beat the ice protocol lvl 9" },
  { locale: "en", content: "just signed up ui looks clean" },
  { locale: "en", content: "void gacha rates feel rough" },
  { locale: "en", content: "who else cant sleep and gaming" },
  { locale: "en", content: "forum post button where lol" },
];

/** 對答：兩句能接上，像真人在頻道裡聊 */
export const AMBIENT_CHAT_DIALOGUES: AmbientChatDialogue[] = [
  // zh-HK
  {
    locale: "zh-HK",
    lines: ["有人玩 core defense 嗎", "有啊 第十二關卡我三日"],
  },
  {
    locale: "zh-HK",
    lines: ["打賞點開架", "創作者後台有得設定 我試過"],
  },
  {
    locale: "zh-HK",
    lines: ["個 gacha 要課先", "唔使吧 慢慢打都得"],
  },
  {
    locale: "zh-HK",
    lines: ["neon 個衝刺幾時用", "雷射預警出現就先切線再衝"],
  },
  {
    locale: "zh-HK",
    lines: ["點解我上唔到榜", "要登入先計分架"],
  },
  {
    locale: "zh-HK",
    lines: ["邊個玩緊節奏", "我 狂熱難度手殘中"],
  },
  {
    locale: "zh-HK",
    lines: ["論壇點發帖", "入遊戲頁面下面有討論區"],
  },
  {
    locale: "zh-HK",
    lines: ["卡牌遊戲有掛嗎", "唔知喎 自己打啦"],
  },
  // zh-CN
  {
    locale: "zh-CN",
    lines: ["这游戏要氪吗", "不用吧 慢慢玩就行"],
  },
  {
    locale: "zh-CN",
    lines: ["有人在吗", "在 刚打完一把"],
  },
  {
    locale: "zh-CN",
    lines: ["排行榜怎么上传", "登录后打游戏会自动传"],
  },
  {
    locale: "zh-CN",
    lines: ["塔防第八波怎么过", "先升核心再铺炮塔"],
  },
  {
    locale: "zh-CN",
    lines: ["跑酷boss怎么躲", "看预警先换道再冲刺"],
  },
  {
    locale: "zh-CN",
    lines: ["打赏开了吗", "好像还是预览 没真扣款"],
  },
  {
    locale: "zh-CN",
    lines: ["论坛在哪", "游戏页面往下翻就有"],
  },
  {
    locale: "zh-CN",
    lines: ["有人联机吗", "这好像都是单机demo"],
  },
  // en
  {
    locale: "en",
    lines: ["anyone on cyber fortune", "yeah stuck on hard mode"],
  },
  {
    locale: "en",
    lines: ["how to tip creators", "game page has a tip button i think"],
  },
  {
    locale: "en",
    lines: ["is this site new", "feels like early access"],
  },
  {
    locale: "en",
    lines: ["void gacha worth it", "free to try just dont expect much"],
  },
  {
    locale: "en",
    lines: ["leaderboard not updating", "u logged in? guest scores dont count"],
  },
  {
    locale: "en",
    lines: ["wave 15 boss tips", "dodge middle lane on triple laser"],
  },
  {
    locale: "en",
    lines: ["anyone beat rhythm fever", "not yet 94% accuracy max"],
  },
  {
    locale: "en",
    lines: ["where forum", "scroll down on the game page"],
  },
];

/** 創作者頻道：創作者之間交流，單句為主 */
export const AMBIENT_CREATOR_SINGLES: AmbientChatSingle[] = [
  { locale: "zh-HK", content: "剛上傳咗 demo 版本 大家有空幫手試玩畀意見" },
  { locale: "zh-HK", content: "打賞仲係 preview 階段 唔會真扣款" },
  { locale: "zh-HK", content: "有人知封面圖建議尺寸嗎 上傳頁冇寫清楚" },
  { locale: "zh-HK", content: "草稿 save 咗先 聽日先轉公開" },
  { locale: "zh-HK", content: "論壇有人回報 bug 記得去答" },
  { locale: "zh-HK", content: "平台費而家 0% 早期上傳幾抵" },
  { locale: "zh-HK", content: "devlog 更新咗 順便改咗遊戲簡介" },
  { locale: "zh-HK", content: "analytics 頁面瀏覽數好似延遲幾分鐘" },
  { locale: "zh-CN", content: "刚传了个 demo 有空帮忙试试给反馈" },
  { locale: "zh-CN", content: "打赏还在预览 不会产生真实扣款" },
  { locale: "zh-CN", content: "封面图尺寸有要求吗 上传页没写太清楚" },
  { locale: "zh-CN", content: "先存草稿了 明天再改公开" },
  { locale: "zh-CN", content: "论坛有人报 bug 记得回复一下" },
  { locale: "zh-CN", content: "早期平台费 0% 现在上传挺划算" },
  { locale: "zh-CN", content: "更新了 devlog 顺便改了简介" },
  { locale: "zh-CN", content: "后台浏览数据好像会延迟几分钟" },
  { locale: "en", content: "just uploaded a demo build — feedback welcome" },
  { locale: "en", content: "tips are still preview only no real charges" },
  { locale: "en", content: "what cover size do you guys use for uploads" },
  { locale: "en", content: "saved as draft for now going public tomorrow" },
  { locale: "en", content: "someone reported a bug on my forum thread gotta check" },
  { locale: "en", content: "0% platform fee during early access is nice" },
  { locale: "en", content: "posted a devlog update and tweaked the description" },
  { locale: "en", content: "analytics page views seem a few mins behind" },
];
