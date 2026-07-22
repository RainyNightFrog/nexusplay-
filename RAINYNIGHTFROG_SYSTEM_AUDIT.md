# RainyNightFrog 系統稽核報告（System Audit）

> **文件性質：** 官方地端專案現況盤點  
> **稽核基準：** 僅依目前工作區內**真實存在且已實作**的程式碼、SQL、腳本與靜態資源  
> **稽核日期：** 2026-07-23  
> **產品品牌：** RainyNightFrog  
> **應用根目錄：** `game-platform/`（工作區根目錄主要為外層依賴與本文件；產品本體在此）

---

## 0. 專案總覽快照

| 項目 | 現況數字／說明 |
|------|----------------|
| 產品套件名稱 | `game-platform`（`package.json` version `0.1.0`） |
| 框架 | Next.js **16.2.10**（App Router）+ React **19.2.4** + `next-intl` |
| 後端／資料 | Supabase（Auth / DB / Storage）+ 約 **144** 支 API `route.ts` |
| 頁面 | **39** 個 `page.tsx` |
| UI 組件 | **148** 個 `components/**/*.{ts,tsx}` |
| 業務函式庫 | **237** 個 `lib/*.ts` |
| Hooks | **14** 個 |
| 多語系 | **11** 種語言（`messages/*.json`） |
| 資料庫腳本 | **73** 個 `supabase/*.sql` |
| 維運腳本 | **130** 個 `scripts/*` |
| 視覺風格 | 暗色 Nexus／極光（`dark` + Geist + `globals.css`） |

### 0.1 工作區目錄結構

```
投稿遊戲/
├── RAINYNIGHTFROG_SYSTEM_AUDIT.md   ← 本文件（專案根目錄）
├── package.json                     ← 外層僅含 recharts 等輔助依賴
├── .cursor/
└── game-platform/                   ← ★ 正式產品程式庫
    ├── app/                         ← 路由、API、全域樣式
    ├── components/                  ← UI 組件
    ├── hooks/                       ← React Hooks
    ├── i18n/ + messages/            ← 多語系
    ├── lib/                         ← 業務／資安／金流／SDK 橋接
    ├── public/                      ← 靜態遊戲、SDK、封面、SW
    ├── scripts/                     ← DB／Seed／OAuth／Stripe 維運
    ├── supabase/                    ← Schema、RLS、Trigger、View
    ├── middleware.ts
    └── next.config.ts
```

### 0.2 實作成熟度總表

| 領域 | 整體狀態 | 備註 |
|------|----------|------|
| 前端 UI／路由／i18n | ✅ 已實作 | 首頁 Bento、標籤篩選、聊天、稱號等齊備 |
| 玩家遊玩／存檔／評論 | ✅ 已實作 | 「進度」以雲端存檔 JSON 為主，無獨立關卡表 |
| 創作者 Dashboard | ✅ 已實作 | Analytics 已接 `analytics_events` 真實資料 |
| Admin 控制中心 | ✅ 已實作 | 單頁多 Tab + 完整 API |
| Stripe Connect／Payout／打賞 | ✅ 已實作 | 依 `STRIPE_PAYMENTS_LIVE` 切 live／preview |
| 資安（Sandbox／消毒／CSP／RLS） | ✅ 已實作 | 限流覆蓋面與 CSP 嚴格度仍可強化 |
| 遊戲 SDK／內建遊戲 | ✅ 已實作 | 雙軌 SDK；VOID GACHA 預覽頁為佔位 |

---

## 1. 🎨 前端 UI/UX 與組件實作（`components/` & `app/`）

### 1.1 路由頁面（Routes）完整清單

語系前綴採 `next-intl`：`defaultLocale = zh-HK`，`localePrefix = "as-needed"`。  
主殼：`app/[locale]/layout.tsx`（暗色、極光背景、懶載聊天、公告橫幅、頁尾）。

#### A. 公開／玩家面向

| 路由 | 檔案 | 用途 |
|------|------|------|
| `/` | `app/[locale]/page.tsx` | 首頁：Bento 網格、標籤篩選、跑馬燈、個人化區塊 |
| `/about` | `app/[locale]/about/page.tsx` | 關於平台 |
| `/legal` | `app/[locale]/legal/page.tsx` | 法律條款 |
| `/search` | `app/[locale]/search/page.tsx` | 全站搜尋 |
| `/feeds` | `app/[locale]/feeds/page.tsx` | RSS／訂閱中心 |
| `/community` | `app/[locale]/community/page.tsx` | 平台社群論壇 |
| `/community/rules` | `app/[locale]/community/rules/page.tsx` | 社群守則 |
| `/game/[id]` | `app/[locale]/game/[id]/page.tsx` | 遊戲詳情／遊玩／打賞／結帳 |
| `/game/[id]/forum` | `app/[locale]/game/[id]/forum/page.tsx` | 單一遊戲論壇 |
| `/creator/[id]` | `app/[locale]/creator/[id]/page.tsx` | 創作者公開頁 |
| `/supporter` | `app/[locale]/supporter/page.tsx` | 平台贊助／Supporter Pass |
| `/notifications` | `app/[locale]/notifications/page.tsx` | 通知中心 |
| `/unsubscribe/forum-digest` | `app/[locale]/unsubscribe/forum-digest/page.tsx` | 論壇摘要郵件退訂 |

#### B. 認證

| 路由 | 檔案 | 用途 |
|------|------|------|
| `/auth` | `app/[locale]/auth/page.tsx` | 登入／註冊 |
| `/auth/choose-role` | `app/[locale]/auth/choose-role/page.tsx` | 選擇玩家／創作者 |
| `/auth/setup-google` 等 | `setup-google|discord|github|twitch/page.tsx` | OAuth 設定引導頁 |
| `/auth/callback` | `app/auth/callback/page.tsx` | OAuth callback（**無** locale 前綴） |

#### C. 創作者 Dashboard

| 路由 | 檔案 | 用途 |
|------|------|------|
| `/dashboard` | `app/[locale]/dashboard/page.tsx` | 總覽、Analytics、營收、遊戲列表 |
| `/dashboard/upload` | `app/[locale]/dashboard/upload/page.tsx` | 上傳遊戲表單 |
| `/dashboard/edit/[id]` | `app/[locale]/dashboard/edit/[id]/page.tsx` | 編輯既有遊戲 |
| `/dashboard/tools` | `app/[locale]/dashboard/tools/page.tsx` | 創作者工具箱 |

#### D. 個人／設定

| 路由 | 檔案 | 用途 |
|------|------|------|
| `/profile` | `app/[locale]/profile/page.tsx` | 個人資料 |
| `/settings` | `app/[locale]/settings/page.tsx` | 應用設定（語言、動效、論壇通知等） |
| `/settings/security` | `.../security/page.tsx` | 安全／2FA |
| `/settings/privacy` | `.../privacy/page.tsx` | 隱私 |
| `/settings/data` | `.../data/page.tsx` | 資料匯出／刪除 |
| `/settings/billing` | `.../billing/page.tsx` | 帳單地址 |
| `/settings/payment` | `.../payment/page.tsx` | 付款方式／打賞紀錄 |
| `/settings/payout` | `.../payout/page.tsx` | 創作者提款（Stripe Connect） |
| `/settings/api` | `.../api/page.tsx` | Creator API Key |
| `/settings/creator` | `.../creator/page.tsx` | 創作者帳號設定 |
| `/settings/favorites` | `.../favorites/page.tsx` | 收藏遊戲 |
| `/settings/following` | `.../following/page.tsx` | 追蹤創作者 |
| `/account/settings`、`/account/profile` | 對應 page | **重新導向**至 `/settings`、`/profile` |

#### E. 管理後台

| 路由 | 檔案 | 用途 |
|------|------|------|
| `/admin` | `app/[locale]/admin/page.tsx` | 超級管理員控制中心（多 Tab） |

#### F. Feed／SEO 路由（非 page）

| 路徑 | 檔案 | 用途 |
|------|------|------|
| `/feed.xml`、`/feed.atom.xml`、`/feeds.opml` | `app/feed*.ts` | 平台 RSS／Atom／OPML |
| `/feed/forum.xml`、`/feed/category|creator|game/...` | `app/feed/**` | 分類／創作者／遊戲／論壇 feed |
| `robots.ts`、`sitemap.ts`、`manifest.ts` | `app/` | SEO／PWA |

### 1.2 Layout 殼層

| 檔案 | 職責 |
|------|------|
| `app/layout.tsx` | 根 layout（僅傳遞 children） |
| `app/[locale]/layout.tsx` | 主站殼：Intl、Auth、極光、聊天、公告、頁尾 |
| `app/auth/layout.tsx` | OAuth callback 獨立 HTML |
| `app/[locale]/settings/layout.tsx`、`profile/layout.tsx` | 帳號設定側欄殼 |
| `app/[locale]/community/layout.tsx` | 社群 SEO |
| `app/[locale]/game/[id]/layout.tsx` | 遊戲頁 metadata／JSON-LD |
| `app/[locale]/creator/[id]/layout.tsx` | 創作者頁 metadata |

### 1.3 首頁核心：Bento Grid + Tags 篩選

| 組件 | 路徑 | 實作重點 |
|------|------|----------|
| **BentoGameGrid** | `components/home/bento-game-grid.tsx` | 響應式遊戲網格；`plays_count` 最高者為 hotPick；含 skeleton |
| **GameCard** | `components/home/game-card.tsx` | 封面、標籤色、收藏、熱門標記 |
| **HomePageClient** | `components/home/home-page-client.tsx` | 篩選／排序串接 Bento 與 Tags |
| **TagFilterBar** | `components/home/tag-filter-bar.tsx` | 標籤多選／展開／清除 |
| PriceFilterSidebar | `components/home/price-filter-sidebar.tsx` | 價格篩選側欄 |
| FeaturedGames / HomeGameRow | `components/home/*` | 精選列、橫向列 |
| HomePersonalizedSections | `components/home/home-personalized-sections.tsx` | 登入後個人化 |
| AnnouncementMarquee | `components/home/announcement-marquee.tsx` | 首頁跑馬燈 |

**相關常數：**

- `lib/game-metadata.ts` — `GAME_GENRES`、`GAME_TAGS`、`GAME_TAG_GROUPS`
- `lib/games.ts` — `TAG_COLORS`、`FILTER_CATEGORIES`、`SORT_OPTIONS`
- `lib/game-tag-filter.ts` — 篩選邏輯

### 1.4 LeaderboardModal（排行榜）

| 項目 | 內容 |
|------|------|
| 組件 | `components/LeaderboardModal.tsx` |
| 功能 | 平台排行榜 Dialog：線上／遊玩時數／打賞；分頁、輪詢；與 `UserBadge`、`ChatPlayerCard`、DM 連動 |
| 常數 | `lib/platform-leaderboard.ts`（`ONLINE_THRESHOLD_MS=5m`、`LEADERBOARD_POLL_MS=10s`、`PAGE_SIZE=10`、`TOP_LIMIT=50`、`TIP_USD_TO_HKD=7.8`） |
| API | `app/api/leaderboards/route.ts`、`app/api/games/[id]/leaderboard/route.ts` |
| 心跳 | `components/analytics/activity-pulse-tracker.tsx`（在線狀態） |

### 1.5 UserBadge 稱號系統

| 組件／模組 | 路徑 | 說明 |
|------------|------|------|
| **UserBadge** | `components/UserBadge.tsx` | 顯示名稱＋已裝備稱號＋Supporter 徽章（inline／stacked／compact） |
| AchievementsModal | `components/AchievementsModal.tsx` | 成就解鎖／領取 |
| ApShopPanel | `components/ApShopPanel.tsx` | AP 商店（外觀／名字色等） |
| SupporterBadge／AvatarInsignia | `components/supporter/*` | VIP／SVIP 徽章與頭像角標 |
| RainbowSafeText | `components/supporter/rainbow-safe-text.tsx` | 管理員／SVIP 炫彩文字 |
| 型別與樣式 | `lib/titles.ts` + `app/globals.css` | 稀有度 `common/rare/epic/legendary`；`.title-tier-*`、`.title-rainynightfrog`、`.supporter-username*` |
| 服務層 | `lib/equipped-title-service.ts`、`lib/supporter-title-service.ts`、`lib/ap-cosmetics.ts`、`lib/achievements.ts` |
| API | `app/api/titles/`、`app/api/achievements/`、`app/api/ap/` |

### 1.6 聊天室系統

| 組件 | 路徑 | 用途 |
|------|------|------|
| ChatWidgetLazy | `components/chat/chat-widget-lazy.tsx` | 全域懶載入口（掛在 locale layout） |
| ChatWidget | `components/chat/chat-widget.tsx` | 世界／創作者頻道、聯絡人、DM |
| ChatMessageList／ChatInput／EmojiPicker | `components/chat/*` | 訊息列表、輸入、Emoji |
| ChatContactsPanel | `components/chat/chat-contacts-panel.tsx` | 聯絡人／私訊 |
| ChatPlayerCard | `components/chat/chat-player-card.tsx` | 玩家名片（排行榜／論壇／聊天共用） |
| ChatModerationPanel | `components/admin/chat-moderation-panel.tsx` | 管理端聊天審核 |
| SupportInboxPanel | `components/admin/support-inbox-panel.tsx` | 客服收件匣 |

**Hooks：** `use-chat-messages`、`use-chat-contacts-unread`、`use-player-dm`、`use-virtual-dm`、`use-chat-player-profile`、`use-admin-support-chat`  
**Lib：** `lib/chat.ts`、`lib/chat-service.ts`、`lib/open-player-dm.ts`

### 1.7 多語言（i18n）

| 項目 | 內容 |
|------|------|
| 引擎 | `next-intl` |
| 設定 | `i18n/routing.ts`、`i18n/request.ts`、`i18n/navigation.ts`、`next-intl.config.ts` |
| 預設語系 | `zh-HK` |
| 支援語言（11） | `zh-HK`、`zh-CN`、`en`、`ja`、`ko`、`es`、`fr`、`de`、`pt`、`th`、`vi` |
| 翻譯檔 | `messages/{locale}.json` |
| UI 切換 | `components/layout/language-switcher.tsx` |
| 遊戲 metadata | `hooks/use-game-i18n.ts` |
| 維運 | `scripts/audit-i18n-keys.mjs`、`repair-i18n-keys.mjs`、`translate-all-locales.mjs`、`sync-*-i18n.mjs` |

`zh-HK.json` 主要命名空間：`nav`、`home`、`game`、`dashboard`、`auth`、`admin`、`chat`、`leaderboard`、`achievements`、`supporter`、`forum`、`creatorTools` 等。

> **並存注意：** `lib/app-settings.ts` 仍有較舊的三語 `AppLanguage`（`zh-HK|zh-CN|en`）本機偏好，與全站 11 語並存。

### 1.8 其他重要 UI 組件分類

#### Layout／導航

`site-header`、`site-brand`、`site-footer`、`site-search`、`mobile-search-button`、`nav-actions`、`notification-bell`、`platform-announcement-banner`、`scroll-to-top-button`、`site-social-links`

#### Auth

`auth-provider`、`user-nav`、`auth-callback-screen`、`mfa-challenge-panel`

#### 遊戲頁／論壇／付費

| 組件 | 用途 |
|------|------|
| `game-embed-bridge.tsx` | iframe ↔ SDK postMessage 橋接 |
| `game-detail-sections.tsx` | 詳情／評論／開發日誌 |
| `community-forum.tsx`、`forum-content-view.tsx`、`forum-rich-text-editor.tsx` | 論壇 |
| `game-checkout-panel.tsx`、`game-payment-methods-panel.tsx` | 購遊戲結帳 |
| `tip-support-panel.tsx`、`tip-stripe-payment-form.tsx`、`tip-saved-card-form.tsx` | 打賞 |
| `supporter-wall.tsx`、`game-support-section.tsx` | 支持者牆 |
| `game-leave-confirm-dialog.tsx` | 離開遊戲確認 |

#### Dashboard／創作者工具

`revenue-panel`、`trend-chart`、`revenue-chart`、`stripe-connect-banner`、`publish-monetization-fields`、`game-pricing-fields`、`genre-tag-picker`、`legacy-import-panel`、`partner-access-panel`，以及 `components/creator-tools/*`（ZIP／SDK 檢查、定價參考、收益計算機、發佈清單等）。

#### Admin（節選）

`admin-shell`、`users-panel`、`orders-panel`、`finance-panel`、`stripe-panel`、`curation-panel`、`forum-moderation-panel`、`announcements-panel`、`entitlements-panel`、`cron-panel`、`launch-checklist-panel`、`digest-report-panel`、`admins-panel`、`analytics-panel`

#### 設計系統

`components/ui/*`（shadcn `base-nova`）：`button`、`dialog`、`tabs`、`skeleton`、`nexus-aurora-background`、`nexus-cursor-glow` 等。  
全域樣式單一入口：`app/globals.css`（Tailwind v4 + 主題 token + 稱號動畫）。

### 1.9 Hooks 清單（14）

| Hook | 用途 |
|------|------|
| `use-auth` | 認證狀態 |
| `use-game-i18n` | 遊戲標籤／分類本地化 |
| `use-chat-messages` | 公開聊天＋ ambient 輪詢 |
| `use-chat-contacts-unread` | 聯絡人未讀 |
| `use-player-dm`／`use-virtual-dm` | 玩家／虛擬私訊 |
| `use-chat-player-profile` | 聊天名片資料 |
| `use-admin-support-chat` | 客服支援聊天 |
| `use-game-favorite-actions` | 收藏 |
| `use-game-form-draft` | 上傳／編輯草稿 |
| `use-game-route-id` | 遊戲路由 id |
| `use-format-count` | 數字格式化 |
| `use-scroll-lock` | 捲動鎖定 |
| `use-api-error` | API 錯誤對應 |

---

## 2. ⚙️ 核心業務與系統功能

### 2.1 玩家遊玩／存檔／評論

| 子功能 | 狀態 | 實作位置 |
|--------|------|----------|
| 遊戲載入與權限閘 | ✅ 已實作 | `app/[locale]/game/[id]/page.tsx` |
| iframe 嵌入＋檔案 proxy | ✅ 已實作 | `app/api/games/[id]/embed/[[...path]]/route.ts` + `GameEmbedBridge` |
| 雲端存檔 | ✅ 已實作 | SDK ↔ Bridge ↔ `PUT/GET .../save` ↔ `lib/game-save.ts` ↔ 表 `game_saves`（上限 **256KB**） |
| 舊存檔匯入 | ✅ 已實作 | `app/api/games/[id]/save/import-legacy/route.ts` |
| 遊玩計數／分析事件 | ✅ 已實作 | `.../play/route.ts` → `incrementGamePlays` + `trackAnalyticsEvent("game_play")` |
| 遊戲內排行榜 | ✅ 已實作 | `.../leaderboard/route.ts` + SDK `submitScore` |
| 評論 | ✅ 已實作 | `game_comments` + `.../comments/route.ts`；舊 `/api/comments` 回 **410 Gone** |
| 關卡進度表 | ⚠️ 部分 | 進度存在存檔 JSON，**無**獨立 progress／關卡 DB 表 |

**關鍵檔案：**

- `components/game/game-embed-bridge.tsx`
- `public/sdk/rnf-game-sdk.js`
- `lib/game-save.ts`、`lib/game-comments-service.ts`
- `lib/iframe-sandbox.ts`、`lib/embed-html-patch.ts`、`lib/rainynightfrog-embed-sdk.ts`
- SQL：`supabase/game-saves.sql`、`game-page-content.sql`、`analytics-events.sql`、`game-leaderboard*.sql`

### 2.2 創作者 Dashboard（Analytics／上傳）

| 子功能 | 狀態 | 說明 |
|--------|------|------|
| Dashboard 總覽 | ✅ | `app/[locale]/dashboard/page.tsx` |
| Analytics | ✅ | `lib/dashboard-analytics-server.ts` 讀 `analytics_events`（`dataSource: "live"`） |
| 營收面板 | ✅ | `revenue-panel` + `api/dashboard/revenue`（打賞營收） |
| 上傳表單 | ✅ | ZIP／封面／定價／打賞／發佈 → `api/games/upload` → `uploadCreatorGameFromFormData` |
| 編輯／管理／刪除 | ✅ | `edit/[id]`、`api/games/[id]/update|manage`、`authorizeGameEdit` |
| 創作者工具箱 | ✅ | 本地檢查 UI + 少數 API（如定價參考） |
| Creator API v1 | ✅ | `api/v1/creator/*`（需 API Key） |
| 舊 mock Analytics | 🧹 死碼 | `lib/dashboard-analytics.ts` 的 `getDashboardAnalytics` **已無人呼叫** |

**相關設定頁：** `/settings/creator`、`/settings/api`、`/settings/payout`

### 2.3 超級管理員 Admin 控制中心

| 項目 | 內容 |
|------|------|
| 入口 | `/admin` → `app/[locale]/admin/page.tsx` |
| 權限 | `lib/admin-auth.ts`：`user_metadata.role === "admin"` **且／或** `profiles.is_admin`；`requireAdmin()` |
| Middleware | `/admin` 需登入並通過 `resolveAdminAccess` |
| 角色模型 | `UserRole = "player" \| "creator"`；**admin 不是第三種 role**，而是獨立 `is_admin` 旗標 |
| 開通方式 | `scripts/assign-admin.mjs`（`npm run db:assign-admin`）— 維運腳本，非自助升權 UI |

#### Admin Tab 功能矩陣

| Tab | UI | 主要 API | 狀態 |
|-----|-----|----------|------|
| 遊戲審批 | 頁內 | `api/admin/games`、`games/[id]` | ✅ |
| 用戶 | `users-panel` | `api/admin/users` | ✅ |
| 論壇審核 | `forum-moderation-panel` | `api/admin/forum/*` | ✅ |
| 客服信箱 | `support-inbox-panel` | `api/admin/support/threads*` | ✅ |
| 聊天審核 | `chat-moderation-panel` | `api/admin/chat/messages*` | ✅ |
| 訂單 | `orders-panel` | `api/admin/orders`、refund | ✅ |
| 權益 | `entitlements-panel` | `api/admin/entitlements` | ✅ |
| 玩家回饋 | 頁內 | `api/admin/feedbacks*` | ✅ |
| 操作日誌 | 頁內 | `api/admin/logs` | ✅ |
| 分析 | `analytics-panel` | `api/admin/analytics` | ✅ |
| 財務／打賞退款 | `finance-panel` | `api/admin/finance`、`tips/[id]/refund` | ✅ |
| Stripe 事件 | `stripe-panel` | `api/admin/stripe/events` | ✅ |
| 策展 | `curation-panel` | `api/admin/curation*` | ✅ |
| 公告 | `announcements-panel` | `api/admin/announcements` | ✅ |
| 管理員名單 | `admins-panel` | `api/admin/admins` | ✅ |
| Cron | `cron-panel` | `api/admin/cron` | ✅ |
| 上線清單 | `launch-checklist-panel` | `api/admin/launch-checklist` | ✅ |
| Digest／WebSub | `digest-report-panel` | `api/admin/forum-digest*`、`websub*` | ✅ |

DB：`supabase/admin-control-center.sql`、`security-hardening-2026.sql`

### 2.4 Stripe Connect 金流與提現（Payout）

| 子功能 | 狀態 | 說明 |
|--------|------|------|
| Express Connect onboarding | ✅ | `startConnectOnboarding` → `createExpressConnectAccount`／`createConnectOnboardingLink` |
| 狀態同步 | ✅ | webhook `account.updated` → `syncConnectAccountFromWebhook` |
| 餘額累積 | ✅ | 打賞成功後累積 `creator_balance_usd` |
| 提現申請 | ✅ | `POST /api/auth/payout/withdraw` → `requestCreatorWithdrawal` → `createConnectAccountPayout` |
| Payout 事件同步 | ✅ | `payout.paid|failed|canceled|updated` |
| Preview／Live 雙模 | ✅ | `isStripeConfigured()`、`isPaymentsLive()`；未 live 時 onboard／tip 走 preview |
| Webhook 去重 | ✅ | `stripe_webhook_events` + `lib/stripe-webhook-dedup.ts` |

**API／頁面：**

| 路徑 | 行為 |
|------|------|
| `api/webhooks/stripe` | 統一 webhook（tips、checkout、Connect、payout、supporter） |
| `api/auth/payout`、`.../onboard`、`.../withdraw` | 快照／開通／提現 |
| `api/stripe/connect` | GET 狀態／POST onboarding（與 payout 並行） |
| `/settings/payout` | 提現 UI |
| `stripe-connect-banner` | Dashboard 提示橫幅 |

**環境變數（見 `.env.example`）：**  
`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_CONNECT_COUNTRY`、`STRIPE_PAYMENTS_LIVE`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`PLATFORM_PREVIEW_MODE`

**SQL：** `creator-payout-stripe.sql`、`add-stripe-user-connect-fields.sql`、`creator-payout-withdrawals.sql`、`payment-safety.sql`、`stripe-webhook-processing-status.sql`

### 2.5 Auth／用戶系統

| 子功能 | 狀態 |
|--------|------|
| Email／密碼、OAuth callback | ✅ |
| 角色 player／creator | ✅（`lib/auth.ts`） |
| Admin 旗標 | ✅（獨立於 role） |
| Profile CRUD | ✅（`api/auth/profile`） |
| 選角色／帳號意圖 | ✅（`api/auth/account-intent`） |
| MFA／2FA UI | ✅（`mfa-challenge-panel`、`settings/security`） |
| 收藏／追蹤／通知／匯出 | ✅ |

關鍵：`AuthProvider`、`middleware.ts`（保護 dashboard／admin／settings）、`supabase/auth.sql`（`profiles` + `handle_new_user`）。

### 2.6 打賞（Tip／Donation）

| 子功能 | 狀態 |
|--------|------|
| 遊戲頁打賞 UI | ✅ `TipSupportPanel` 等 |
| PaymentIntent 結帳 | ✅ `createTipPaymentIntent` |
| Preview tip（無 live） | ✅ `recordPreviewTip` |
| Webhook 入帳／退款／爭議 | ✅ `tip-payment-webhook.ts` |
| 收據／Email | ✅（Email 依 Resend） |
| 支持者牆 | ✅ |
| Admin 退款 | ✅ |
| 創作者營收面板 | ✅ |

**API：** `games/[id]/tips`、`games/tips/confirm`、`games/tips/[tipId]/receipt`、`games/[id]/supporters`、`auth/tips`、`admin/tips/[id]/refund`  
**DB：** `game_tips`、`game-tips-receipt.sql`、`game-tip-fee-lock.sql`

---

## 3. 🛡️ 實體資安防禦與 Supabase RLS 現狀

### 3.1 Iframe Sandbox 隔離

**核心：** `lib/iframe-sandbox.ts`

| 常數 | Sandbox 屬性 | 用途 |
|------|--------------|------|
| `IFRAME_SANDBOX_OPAQUE` | `allow-scripts allow-forms allow-pointer-lock` | 外站嵌入（**不含** `allow-same-origin`） |
| `IFRAME_SANDBOX_SAME_ORIGIN` | 上述 + `allow-same-origin` | 平台自身／embed proxy／`/demos`／`/games` |

**規則摘要（`sandboxForEmbedUrl`）：**

- `/api/games/.../embed` → 同源
- `rainynightfrog.com`／子網域／`localhost` → 同源
- 其他外站 URL → opaque（防讀平台 cookie／session）
- **一律不給** `allow-top-navigation*`（防挾持父頁）

**套用：** 遊戲頁 iframe + `buildEmbedCode()`；另設 `referrerPolicy="no-referrer"`。

### 3.2 Rate Limiting 限流

#### A. 記憶體滑動視窗 — `lib/rate-limit.ts`

| API | Key | 上限 |
|-----|-----|------|
| `GET /api/leaderboards` | `leaderboards:get:{ip}` | **60／60s** |
| `GET .../comments` | `comments:get:{ip}` | **120／60s** |
| `POST .../comments` | `comments:post:{ip}` | **10／60s** |

> 註解已標明：單實例適用；多節點需 Redis。

#### B. 聊天 DB 限流 — `lib/chat-service.ts` + `CHAT_LIMITS`

| 規則 | 值 |
|------|-----|
| 最短間隔 | 2 秒 |
| 每分鐘上限 | 20 則 |
| 重複內容視窗 | 30 秒 |
| 內容長度 | 200 字 |

#### 覆蓋缺口

多數其他 API（upload、checkout、auth、forum、DM 等）**尚未**呼叫 `checkRateLimit`。

### 3.3 XSS 消毒邏輯

**未使用 DOMPurify**；主引擎為 `sanitize-html`。

| 模組 | 路徑 | 行為 |
|------|------|------|
| 純文字 | `lib/sanitize-plain.ts` | 剝標籤、清控制字元、截斷；`escapeHtml` |
| 富文本 | `lib/sanitize-rich-html.ts` | 白名單標籤／屬性；`<a rel="noopener noreferrer">`；儲存＋渲染雙重消毒 |
| 再匯出 | `lib/sanitize.ts` | re-export |

**主要呼叫點：** profile、聊天、留言、論壇、遊戲上傳／更新、帳單、`forum-content-view`／`game-detail-sections`（`dangerouslySetInnerHTML` 前消毒）、Email 模板自建 `escapeHtml`。  
**開放重導防護：** `lib/safe-redirect.ts` → `sanitizeInternalRedirect`。

### 3.4 Content Security Policy（CSP）Headers

**設定於** `next.config.ts` 的 `headers()`（`source: "/(.*)"`）；**middleware 未另設 CSP**。

| Header | 要點 |
|--------|------|
| `Content-Security-Policy` | `default-src 'self'`；`frame-ancestors 'self'`；`object-src 'none'` |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` + Stripe JS + GA |
| `style-src` | `'self' 'unsafe-inline'` |
| `img-src` | self + data/blob/https + Unsplash／Dicebear／Google／Supabase |
| `connect-src` | self + Supabase + WSS + Stripe + GA + void-gacha |
| `frame-src` | self + Supabase + Stripe |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | 正式環境長期 HSTS + preload |

> **風險備註：** `unsafe-inline`／`unsafe-eval` 利於相容，但削弱 XSS 深度防護。

### 3.5 PostgreSQL Triggers（含 Auth Hook 防篡改）

路徑皆在 `game-platform/supabase/`。

| Trigger | SQL 檔 | 作用 |
|---------|--------|------|
| `guard_auth_user_metadata` | `auth-guard-user-metadata.sql` | `BEFORE UPDATE` on `auth.users`：擋 client 改 `raw_user_meta_data.role`／自行設 admin（`service_role` 除外） |
| `profiles_block_sensitive_update` | `security-hardening-2026.sql`（及 moderation／supporter 擴充） | 擋竄改餘額、Stripe ID、supporter、停權／禁言等 |
| `profiles_block_is_admin_update` | `security-hardening-2026.sql` | 擋 client 改 `profiles.is_admin` |
| `on_auth_user_created` | `auth.sql` | 新用戶建 `profiles`（role 僅 player／creator） |
| `on_auth_user_created_activity_stats` | `user-activity-stats.sql` | 新用戶建活動統計列 |
| `on_user_achievement_unlock_grant_title` | `achievements-titles.sql` | 解鎖成就自動發稱號 |

另有多個 `security definer` 函式（如 `credit_ap`、`grant_achievement`、`record_user_donation`、`pulse_user_activity`）作為伺服器寫入邊界。

### 3.6 打賞數據脫敏 View

**SQL：** `supabase/user-activity-stats-masking.sql`

1. **`donation_privacy_tier(amount)`** → `none`／`supporter`／`enthusiast`／`patron`／`legend`
2. **View `user_activity_stats_public`**（`security_invoker = true`）  
   - 公開欄位含 **`donation_tier`（無精確金額）**  
   - `grant select` 給 `anon, authenticated`
3. **原表 RLS 收緊**  
   - 僅本人或 `is_admin()` 可讀 `user_activity_stats`（含精確 `total_donated`）

**應用層雙重脫敏：** `lib/activity-stats-masking.ts`（`maskDonationAmount`／`maskDonationTotalForProfile`）用於排行榜與聊天名片。

### 3.7 RLS Policies 概覽（主要表）

| Table | 政策摘要 |
|-------|----------|
| `profiles` | 公開讀（欄位級 GRANT 限公開欄）；自己更新；敏感欄靠 trigger |
| `games` | 公開僅 `publish_status=public` + `status=approved`；創作者 CRUD 自己的 |
| `game_tips` | 創作者／付款者僅 SELECT；寫入走 service role |
| `orders`／`game_entitlements` | 買家／使用者讀自己；寫入 service role |
| `game_saves` | 玩家僅讀寫自己的存檔 |
| `chat_messages` | 已登入讀近期；insert／recall 僅自己 |
| `dm_*`／`support_*` | 參與者／本人；admin 可讀 |
| `forum_*`／`game_comments` | 公開讀；已登入可 insert |
| `game_leaderboard` | 公開讀；玩家寫自己的 |
| `user_activity_stats` | 本人／admin；公開走脫敏 View |
| `stripe_webhook_events` | **僅 service_role** |
| `creator_payouts` | 創作者讀自己；寫入 service role；inflight 防重複提領 |
| `creator_api_keys` | 使用者管理自己的 |
| `ap_*`／成就／稱號 | 錢包／解鎖僅本人；目錄公開讀 |
| Storage（covers／files／avatars） | 公開讀；創作者／本人寫 |
| `analytics_events` | 僅 admin 讀 |
| `game_legacy_imports` | 禁止直接 client 存取 |

### 3.8 其他安全措施

| 措施 | 位置 |
|------|------|
| Admin API 閘門 | 幾乎所有 `app/api/admin/**` 開頭 `requireAdmin()` |
| Stripe webhook 簽章 | `constructEvent(..., STRIPE_WEBHOOK_SECRET)`；失敗 400 |
| Cron 認證 | `lib/cron-auth.ts`：`Bearer ${CRON_SECRET}` |
| API Key | `lib/api-key-service.ts`：SHA-256 hash，明文只回傳一次 |
| Email 退訂 token | HMAC-SHA256 + `timingSafeEqual` |
| 正式環境 service role | `lib/supabase-server.ts` 強制檢查 |
| 上線檢查 | `lib/launch-checklist-service.ts` |
| Column-level GRANT | 餘額／Stripe／`is_admin` 不授給 anon／authenticated |

---

## 4. 🎮 遊戲 SDK 與內建遊戲內容

### 4.1 SDK 雙軌架構

```
平台頁 GameEmbedBridge (React)
        │  postMessage
        ├──────────────► rnf-game-sdk.js          （內建 10 款街機）
        ├──────────────► platform-bridge.js       （demos 7 款）
        └──────────────► 注入 RainyNightFrog SDK  （lib/rainynightfrog-embed-sdk.ts）
                              │
                    API proxy 白名單：
                    /api/games/{id}/(save|save/import-legacy|leaderboard)
```

| SDK 檔案 | 角色 |
|----------|------|
| `public/sdk/rnf-game-sdk.js` | `window.RNF`：殼層、音效、排行榜、存檔、postMessage（約 72KB） |
| `public/demos/platform-bridge.js` | Demo 橋接：雲端存檔／排行榜／離開確認／auth（約 31KB；origin 檢查較嚴） |
| `public/demos/demo-game-enhance.js` | Demo 共用：DPR、game loop、粒子上限 |
| `lib/rainynightfrog-embed-sdk.ts` | 建置時注入 iframe：`loadSave`／`saveSave`／`api-proxy`／相容舊名 `NexusPlay` |

**訊息型別（節選）：**  
`rainynightfrog:auth|ready|resize|leave|api-proxy-*|storage-*`、`RNF_SUBMIT_SCORE`、`RNF_SAVE_DATA`（含舊 `nexusplay:*` 別名）。

**Parent bridge 重點（`game-embed-bridge.tsx`）：**

- API proxy 僅允許存檔／舊存檔匯入／排行榜
- `RNF_SUBMIT_SCORE` → `POST .../leaderboard`
- `RNF_SAVE_DATA` → `PUT .../save`
- 父頁 `localStorage` 鍵：`rnf:{slug}:{suffix}`
- 離開確認 Dialog

### 4.2 內建 HTML5 遊戲（`public/games/*/index.html`）

皆載入 `/sdk/rnf-game-sdk.js?v=20260723b`：

| 目錄 slug | 標題 |
|-----------|------|
| `neon-snake-extreme` | Neon Snake Extreme · 霓虹極速貪食蛇 |
| `cyber-bubble-pop` | Cyber Bubble Pop · 賽博泡泡龍 |
| `quantum-tic-tac-toe` | Quantum Tic-Tac-Toe · 量子過三關 |
| `void-brick-breaker` | Void Brick Breaker · 虛空打磚塊 |
| `rainy-frog-dash` | Rainy Frog Dash · 雨夜飛天蛙 |
| `neon-tetromino-rush` | Neon Tetromino Rush · 霓虹方塊衝刺 |
| `galactic-invader-2026` | Galactic Invader 2026 · 星際侵略者 2026 |
| `memory-matrix-glitch` | Memory Matrix Glitch · 駭客矩陣記憶翻牌 |
| `overdrive-cyber-pong` | Overdrive Cyber Pong · 超光速霓虹乒乓 |
| `cyber-neon-runner` | Cyber Neon Runner · 賽博霓虹無盡跑酷 |

封面：`public/covers/[slug]-cover.png`。

### 4.3 Demo 預覽（`public/demos/*`）

| 檔案 | 對應／備註 |
|------|------------|
| `core-defense-preview.html` | CoreDefense: Mindustry X |
| `cyber-fortune-preview.html` | CyberFortune 012 |
| `neon-abyss-runner-preview.html` | Neon Abyss: Void Runner |
| `signal-breach-preview.html` | Signal Breach: ICE Protocol |
| `void-relay-preview.html` | Void Relay: Card Descent |
| `pulse-protocol-preview.html` | Pulse Protocol: Neon Beat |
| `orbital-salvage-preview.html` | 軌道回收：環形防線 |
| **`void-gacha-preview.html`** | ⚠️ **僅佔位落地頁**（無遊戲邏輯、無 bridge）；真包靠 `upload:void-gacha` |

### 4.4 其他 public 資源

- `public/sw.js` — Service Worker（推播等）
- `public/brand/*` — 品牌圖示

### 4.5 資料庫 Seed 腳本現況

| 腳本 | npm／用途 |
|------|-----------|
| `scripts/seed-platform.mjs` | `db:seed` — 示範遊戲、假遊玩數、論壇種子、seed 使用者 |
| `scripts/seed-virtual-games.ts` | `db:seed-virtual-games` — 10 虛擬創作者 + 10 內建街機寫入 DB |
| `scripts/seed-rainynightfrog-followers.mjs` | `db:seed-rnf-followers` — 預設約 624 名追蹤 bot |
| `scripts/seed-creator-usernames.mjs` | 示範創作者 username（子網域測試） |
| `scripts/generate-virtual-game-covers.mjs` | 同步封面 URL |
| `scripts/upload-void-gacha-zip.ts` | `upload:void-gacha` — Service Role 上傳 VOID GACHA zip |
| `supabase/seed-platform.sql` | SQL 版種子 |
| `check-10-games.mjs` | Playwright 檢查 10 款內建遊戲（假設 id 區間環境相依） |

> Seed 密碼硬編碼字串出現於多支腳本（例：`SeedPass_RainyNightFrog_2026!`）— **僅供開發／示範，勿當正式帳密**。

### 4.6 Scripts 維運分類（約 130 支）

| 類別 | 代表 |
|------|------|
| DB migration 執行器 | `run-*.mjs` → 對應 `supabase/*.sql`（saves、leaderboard、chat、forum、orders、RLS、security…） |
| Seed／補資料 | 上表 + `grant-supporter`、`backfill-supporter-titles`、`assign-admin`、`assign-game-creator` |
| 聊天氛圍 | `run-chat-ambient*.mjs/ts`、`chat:ambient` |
| 遊戲 HTML patch | `patch-keyboard.mjs`、`patch-game-speed.mjs`、`patch-virtual-games.mjs` |
| OAuth／Auth | `setup-*-oauth.mjs`、`configure-production-auth.mjs`、`fix-auth-redirect-urls.mjs` |
| Stripe／DNS／Vercel／郵件 | `setup-stripe-webhook`、`go-stripe-live`、`setup-subdomain-dns`、`setup-resend-domain` |
| i18n | `i18n:sync`、`i18n:translate`、各 `sync-*-i18n.mjs` |
| 環境檢查 | `check-platform-env.mjs`、`check-stripe-setup.mjs`、`verify-account-features.mjs` |

---

## 5. ⚠️ 殘留 TODO、未補齊細節與潛在風險

### 5.1 程式註解掃描結論

在 `game-platform` 原始碼中搜尋 `TODO`／`FIXME`／`HACK`／`XXX`／`WIP`：**幾乎沒有**真正的待辦註解。  
出現的「待補」「未完成」「placeholder」多半是：

- UI 表單 placeholder 文案
- 業務狀態訊息（創作者未完成 Stripe、金流預覽中）
- 草稿預設文案（`lib/draft-placeholder-cover.ts`：`（草稿，簡介待補）`）

### 5.2 尚未完全連動／優化空間清單

| 優先級 | 項目 | 說明 |
|--------|------|------|
| 🔴 高 | Seed 密碼硬編碼 | 多支 seed 腳本共用固定密碼；正式環境切勿沿用 |
| 🔴 高 | `postMessage(..., "*")` | `rnf-game-sdk.js`、`game-embed-bridge.tsx`、注入 SDK 多用 `*`；demo bridge 較嚴（同 origin）。跨來源時建議鎖目標 origin |
| 🔴 高 | `void-gacha-preview.html` 空殼 | 若 DB 仍指向 preview，玩家只看到佔位頁；真遊戲需 `upload:void-gacha` |
| 🔴 高 | 虛擬／模擬資料仍在線上邏輯 | `platform-leaderboard-virtual.ts`、`virtual-players*`、`virtual-dm*`、seed 假遊玩數；收藏數為 0 時可能顯示種子按讚數 |
| 🟠 中 | API 限流覆蓋面窄 | 僅排行榜／留言＋聊天；upload／checkout／auth／forum／DM 等未統一限流 |
| 🟠 中 | CSP `unsafe-inline`／`unsafe-eval` | 相容第三方，但降低 XSS 防護深度 |
| 🟠 中 | 金流 Preview 模式 | 未開 `STRIPE_PAYMENTS_LIVE` 時 UI 顯示「金流準備中」；屬部署設定，非缺功能，但需上線前確認 |
| 🟠 中 | Patch 腳本 SDK 版本過舊 | 部分 patch 寫死 `?v=20260714`／`20260717`；實際遊戲已是 `20260723b`—再跑可能降版 |
| 🟠 中 | 雙／三 SDK 並存 | RNF／platform-bridge／注入 RainyNightFrog 行為略異，維護成本高 |
| 🟠 中 | WebSub callback | 主要靠 topic 白名單，未見 hub 簽章驗證 |
| 🟡 低 | Dashboard mock 死碼 | `getDashboardAnalytics` 無人呼叫，可清理 |
| 🟡 低 | AppLanguage 三語 vs 全站 11 語 | `app-settings` 與 next-intl 並存，可能造成設定語意混淆 |
| 🟡 低 | `ENABLE_OAUTH_SETUP` | 開發用 OAuth 設定端點；launch checklist 已警告正式站勿長期開啟 |
| 🟡 低 | 硬編碼網址 | `auth-site-config.mjs`、`embed-html-patch.ts`（含 `void-gacha.com`）等 |
| 🟡 低 | Rate limit 單實例 | 多節點部署需改 Redis／共享儲存 |
| 🟡 低 | 「進度」無獨立表 | 僅存檔 JSON＋分數排行；若要跨裝置關卡統計需另設計 |
| 🟡 低 | 根目錄 `package.json` | 僅 `recharts`，與 `game-platform` 本體分離—可能是輔助依賴誤放 |

### 5.3 建議後續對照檢查（非本文件執行項目）

1. 正式 Supabase 是否已依序執行全部 `supabase/*.sql`（尤其 `security-hardening-2026`、masking、auth-guard）
2. 正式站環境變數：`STRIPE_PAYMENTS_LIVE`、webhook secret、`CRON_SECRET`、service role
3. VOID GACHA 與其他遊戲的 `game_url`／embed 是否仍指向佔位 preview
4. 是否關閉或隔離虛擬排行榜／ambient 聊天在正式環境的可見性
5. 是否收斂 SDK 通訊 origin 與統一 `rnf-game-sdk.js` 版本字串

---

## 附錄 A — 技術棧速查

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 16、React 19、Tailwind 4、shadcn（base-nova）、Framer Motion、TipTap |
| i18n | next-intl（11 locales） |
| 後端 | Next.js Route Handlers（約 144） |
| 資料 | Supabase Auth／Postgres／Storage；73 SQL |
| 金流 | Stripe + Stripe Connect Express |
| 郵件 | Resend（依環境） |
| 推播 | web-push + `public/sw.js` |
| 消毒 | sanitize-html |
| 圖表 | recharts |

## 附錄 B — 通訊／存檔流程（精簡）

1. iframe 載入 → `ready` + `gameId` → parent 回 `auth` + `resize`  
2. 存檔：`RNF_SAVE_DATA` 或 `RainyNightFrog.saveSave` →（必要時）api-proxy → `PUT /api/games/:id/save` → `game_saves`  
3. 分數：`RNF_SUBMIT_SCORE` → `POST .../leaderboard`  
4. 本機備援：`rainynightfrog:storage-*` 寫在**父頁** `localStorage`（避開 iframe 隔離）

## 附錄 C — 文件說明

- 本報告描述的是**地端程式庫現況**，不保證遠端正式 DB／Vercel 環境變數已與腳本完全同步。  
- 路徑皆相對於 `game-platform/`，除非另行標明工作區根目錄。  
- 狀態標記：✅ 已實作　⚠️ 部分／需設定　🧹 死碼　🔴🟠🟡 風險優先級。

---

**文件結束 · RainyNightFrog System Audit · 2026-07-23**
