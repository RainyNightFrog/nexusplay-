import fs from "node:fs";
import path from "node:path";

const messagesDir = path.join(process.cwd(), "messages");

const commonExtras = {
  "zh-HK": { newListing: "新上架", defaultCreator: "RainyNightFrog 創作者" },
  "zh-CN": { newListing: "新上架", defaultCreator: "RainyNightFrog 创作者" },
  en: { newListing: "New", defaultCreator: "RainyNightFrog Creator" },
  ja: { newListing: "新着", defaultCreator: "RainyNightFrog クリエイター" },
  ko: { newListing: "신규", defaultCreator: "RainyNightFrog 크리에이터" },
  es: { newListing: "Nuevo", defaultCreator: "Creador de RainyNightFrog" },
  fr: { newListing: "Nouveau", defaultCreator: "Créateur RainyNightFrog" },
  de: { newListing: "Neu", defaultCreator: "RainyNightFrog-Ersteller" },
  pt: { newListing: "Novo", defaultCreator: "Criador RainyNightFrog" },
  th: { newListing: "ใหม่", defaultCreator: "ครีเอเตอร์ RainyNightFrog" },
  vi: { newListing: "Mới", defaultCreator: "Nhà sáng tạo RainyNightFrog" },
};

const apiByLocale = {
  "zh-HK": {
    unknown: "發生錯誤，請稍後再試",
    loginRequired: "請先登入",
    loginRequiredForum: "請先登入才能參與討論",
    creatorRequiredUpload: "需要創作者身分才能上傳遊戲",
    creatorRequiredUpdate: "需要創作者身分才能更新遊戲",
    creatorRequiredManage: "需要創作者身分才能管理遊戲",
    creatorRequiredEdit: "需要創作者身分才能編輯遊戲",
    invalidGameId: "無效的遊戲 ID",
    invalidId: "無效的 ID",
    gameNotFound: "找不到此遊戲",
    postNotFound: "找不到此貼文",
    noEditPermission: "你沒有權限編輯此遊戲",
    titleRequired: "請輸入遊戲名稱",
    descriptionRequired: "請輸入遊戲簡介",
    categoryRequired: "請選擇遊戲分類",
    invalidCategory: "無效的遊戲分類",
    coverRequired: "請上傳遊戲封面圖",
    zipRequired: "請上傳遊戲壓縮檔",
    avatarFormat: "頭像僅支援 .png、.jpg、.webp 格式",
    avatarTooLarge: "頭像不可超過 2 MB",
    avatarRequired: "請選擇頭像圖片",
    displayNameRequired: "請輸入顯示名稱",
    websiteInvalid: "個人網站網址格式不正確",
    postTitleRequired: "請輸入貼文標題",
    postContentRequired: "請輸入貼文內容",
    postCategoryInvalid: "請選擇有效的貼文分類",
    replyRequired: "請輸入回覆內容",
    newVersionZipRequired: "發布新版本需上傳新的 .zip 遊戲包",
    loadGameFailed: "讀取遊戲失敗",
    loadGamesFailed: "讀取遊戲列表失敗",
    loadForumFailed: "讀取討論區失敗",
    loadRepliesFailed: "讀取回覆失敗",
    loadPostFailed: "讀取貼文失敗",
    postFailed: "發布討論失敗",
    replyFailed: "發表回覆失敗",
    loadProfileFailed: "讀取個人資料失敗",
    updateProfileFailed: "更新個人資料失敗",
    avatarUploadFailed: "頭像上傳失敗",
    updatePlayCountFailed: "更新遊玩次數失敗",
    uploadFailed: "上傳失敗，請稍後再試",
    updateFailed: "更新失敗，請稍後再試",
    loadGameDataFailed: "讀取遊戲資料失敗",
    updateUnknown: "更新過程發生未知錯誤",
    uploadUnknown: "上傳過程發生未知錯誤",
    loadCreatorGamesFailed: "讀取創作者遊戲失敗",
    coverTooLargeGeneric: "封面圖超過大小上限",
    zipTooLargeGeneric: "遊戲 zip 超過大小上限",
    supabaseConnection:
      "無法連線 Supabase：Project URL 可能錯誤或專案 DNS 尚未生效。請到 Supabase → Settings → Data API 複製「Project URL」，貼到 .env.local 後重啟。",
    supabaseFileTooLarge:
      "檔案超過 Supabase 大小上限（Free 方案單檔最大 50 MB）。請壓縮 zip 後再試，或升級 Pro 方案提高上限。",
  },
  "zh-CN": {
    unknown: "发生错误，请稍后再试",
    loginRequired: "请先登录",
    loginRequiredForum: "请先登录才能参与讨论",
    creatorRequiredUpload: "需要创作者身份才能上传游戏",
    creatorRequiredUpdate: "需要创作者身份才能更新游戏",
    creatorRequiredManage: "需要创作者身份才能管理游戏",
    creatorRequiredEdit: "需要创作者身份才能编辑游戏",
    invalidGameId: "无效的游戏 ID",
    invalidId: "无效的 ID",
    gameNotFound: "找不到此游戏",
    postNotFound: "找不到此帖子",
    noEditPermission: "你没有权限编辑此游戏",
    titleRequired: "请输入游戏名称",
    descriptionRequired: "请输入游戏简介",
    categoryRequired: "请选择游戏分类",
    invalidCategory: "无效的游戏分类",
    coverRequired: "请上传游戏封面图",
    zipRequired: "请上传游戏压缩包",
    avatarFormat: "头像仅支持 .png、.jpg、.webp 格式",
    avatarTooLarge: "头像不可超过 2 MB",
    avatarRequired: "请选择头像图片",
    displayNameRequired: "请输入显示名称",
    websiteInvalid: "个人网站网址格式不正确",
    postTitleRequired: "请输入帖子标题",
    postContentRequired: "请输入帖子内容",
    postCategoryInvalid: "请选择有效的帖子分类",
    replyRequired: "请输入回复内容",
    newVersionZipRequired: "发布新版本需上传新的 .zip 游戏包",
    loadGameFailed: "读取游戏失败",
    loadGamesFailed: "读取游戏列表失败",
    loadForumFailed: "读取讨论区失败",
    loadRepliesFailed: "读取回复失败",
    loadPostFailed: "读取帖子失败",
    postFailed: "发布讨论失败",
    replyFailed: "发表回复失败",
    loadProfileFailed: "读取个人资料失败",
    updateProfileFailed: "更新个人资料失败",
    avatarUploadFailed: "头像上传失败",
    updatePlayCountFailed: "更新游玩次数失败",
    uploadFailed: "上传失败，请稍后再试",
    updateFailed: "更新失败，请稍后再试",
    loadGameDataFailed: "读取游戏数据失败",
    updateUnknown: "更新过程中发生未知错误",
    uploadUnknown: "上传过程中发生未知错误",
    loadCreatorGamesFailed: "读取创作者游戏失败",
    coverTooLargeGeneric: "封面图超过大小上限",
    zipTooLargeGeneric: "游戏 zip 超过大小上限",
    supabaseConnection:
      "无法连接 Supabase：Project URL 可能错误或项目 DNS 尚未生效。请到 Supabase → Settings → Data API 复制「Project URL」，粘贴到 .env.local 后重启。",
    supabaseFileTooLarge:
      "文件超过 Supabase 大小上限（Free 方案单文件最大 50 MB）。请压缩 zip 后再试，或升级 Pro 方案提高上限。",
  },
};

const enData = JSON.parse(
  fs.readFileSync(path.join(messagesDir, "en.json"), "utf8")
);
const enApi = enData.errors.api;
const enOrphanHint = enData.dashboard.orphanGameHint;

for (const locale of fs.readdirSync(messagesDir).filter((f) => f.endsWith(".json"))) {
  const code = locale.replace(".json", "");
  const filePath = path.join(messagesDir, locale);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  data.common = { ...data.common, ...commonExtras[code] };
  data.errors = data.errors ?? {};
  data.errors.api = apiByLocale[code] ?? enApi;

  const extraCategories = {
    "2D": "2D",
    "多人": code.startsWith("zh")
      ? code === "zh-CN"
        ? "多人"
        : "多人"
      : code === "ja"
        ? "マルチ"
        : code === "ko"
          ? "멀티"
          : code === "es"
            ? "Multijugador"
            : code === "fr"
              ? "Multijoueur"
              : code === "de"
                ? "Mehrspieler"
                : code === "pt"
                  ? "Multijogador"
                  : code === "th"
                    ? "ผู้เล่นหลายคน"
                    : code === "vi"
                      ? "Nhiều người"
                      : "Multiplayer",
    RPG: "RPG",
    "競速": code === "zh-CN" ? "竞速" : code === "ja" ? "レース" : code === "ko" ? "레이싱" : code === "es" ? "Carreras" : code === "fr" ? "Course" : code === "de" ? "Rennen" : code === "pt" ? "Corrida" : code === "th" ? "แข่งความเร็ว" : code === "vi" ? "Đua xe" : "Racing",
    "休閒": code === "zh-CN" ? "休闲" : code === "ja" ? "カジュアル" : code === "ko" ? "캐주얼" : code === "es" ? "Casual" : code === "fr" ? "Casual" : code === "de" ? "Gelegenheit" : code === "pt" ? "Casual" : code === "th" ? "สบายๆ" : code === "vi" ? "Giải trí" : "Casual",
    "射擊": code === "zh-CN" ? "射击" : code === "ja" ? "シューティング" : code === "ko" ? "슈팅" : code === "es" ? "Disparos" : code === "fr" ? "Tir" : code === "de" ? "Shooter" : code === "pt" ? "Tiro" : code === "th" ? "ยิง" : code === "vi" ? "Bắn súng" : "Shooter",
  };

  data.home.categories = { ...data.home.categories, ...extraCategories };

  if (code === "zh-HK") {
    data.dashboard.orphanGameHint =
      "「{title}」尚未綁定創作者帳號（舊版上傳常見）。儲存變更後將自動綁定至你的帳號。";
  } else if (code === "zh-CN") {
    data.dashboard.orphanGameHint =
      "「{title}」尚未绑定创作者账号（旧版上传常见）。保存变更后将自动绑定至你的账号。";
  } else if (code === "en") {
    data.dashboard.orphanGameHint =
      '"{title}" is not linked to a creator account yet (common with legacy uploads). Saving will automatically link it to your account.';
  } else {
    data.dashboard.orphanGameHint = enOrphanHint;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Patched ${locale}`);
}
