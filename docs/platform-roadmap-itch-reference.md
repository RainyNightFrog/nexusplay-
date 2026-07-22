# RainyNightFrog 平台策略與 itch.io 參考備忘

> 永久記錄：2026-07-06 agent 對話整理。日後擴展平台、上線金流、調整費率時請先查閱本文。

## 核心商業策略

| 項目 | 決策 |
|------|------|
| 平台費 | **現階段 0%**，先把平台做大 |
| 日後參考費率 | 5%（僅文案／規劃，未生效） |
| 調整公告期 | 至少 **30 天**，只影響生效後新交易 |
| Grandfather | 首次開啟打賞時鎖定 `games.platform_fee_percent`；已鎖 0% 的遊戲永久 0% |
| 收款模式 | **Marketplace**（玩家 → 平台 Stripe Connect → 創作者餘額 → 批次提領） |
| 不做 | itch.io 式創作者自選分成 slider、雙收款模式（平台代收 vs 直連） |
| 營運地 | 香港；上線金流前需 BR/Ltd + Stripe Connect HK |

## 技術常數（`lib/tip-fee-policy.ts`）

```ts
PLANNED_PLATFORM_FEE_PERCENT = 0
PLANNED_FUTURE_PLATFORM_FEE_PERCENT = 5
FEE_CHANGE_NOTICE_DAYS = 30
PAYMENT_PROCESSOR_FEE_PERCENT = 2.9
PAYMENT_PROCESSOR_FEE_FIXED_USD = 0.3
```

## 資料庫（打賞相關）

- `games.platform_fee_percent` — 每遊戲鎖定平台費；首次 `tips_enabled=true` 時寫入
- Migration: `supabase/game-tip-fee-lock.sql` → `npm run db:tip-fee-lock`

## itch.io 帳戶設定對照表

### Phase A — 現階段必做（已實作）

| 功能 | itch.io | RainyNightFrog |
|------|---------|-----------|
| 帳戶設定 sidebar 分組 | ✓ | `/settings/*`、`/profile` |
| 改密碼 | ✓ | `/settings/security` |
| 支援信箱（創作者） | ✓ | `/settings/creator` → `profiles.support_email` |
| 顯示鎖定平台費 | — | 編輯遊戲頁 badge |
| 資料匯出 | ✓ | `/settings/data` |
| 刪除帳戶 | ✓ | `/settings/data` |
| 隱私基本設定 | ✓ | `/settings/privacy` |

### Phase B — 金流上線前必做（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| Stripe Connect Express | ✓ | `/settings/payout`；需 `STRIPE_SECRET_KEY` + live |
| 玩家儲存付款方式 | ✓ | `/settings/payment`；需 `STRIPE_PAYMENTS_LIVE=true` |
| 稅務／KYC | 交給 Stripe | Connect onboarding 內建 |
| 創作者餘額 + 提領門檻 | ✓ | `profiles.creator_balance_usd`，門檻 $25 |
| 2FA | ✓ | `/settings/security` TOTP（Supabase MFA） |

Migration: `npm run db:creator-payout`

### Phase B — Checkout（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 遊戲頁打賞 UI | ✓ | `TipSupportPanel` on `/game/[id]` |
| 打賞 Checkout API | ✓ | `POST /api/games/[id]/tips` |
| Stripe Payment Intent | ✓ | Connect destination + 0% application fee |
| 確認／Webhook | ✓ | `/api/games/tips/confirm`, `/api/webhooks/stripe` |
| 交易紀錄 | ✓ | `game_tips` 表；preview / succeeded |
| 創作者餘額更新 | ✓ | 成功付款後累加 `creator_balance_usd` |

Migration: `npm run db:game-tips`

啟用真實金流：`.env.local` 設定 `STRIPE_SECRET_KEY`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`STRIPE_PAYMENTS_LIVE=true`

### Phase C — 平台變大後（部分已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 創作者 Dashboard 真實分析 | ✓ | `GET /api/dashboard/analytics` ← `analytics_events` |
| GA4 client 事件（可選） | ✓ | `NEXT_PUBLIC_GA_MEASUREMENT_ID`；`game_play` 事件 |
| Partner access 試玩碼 | ✓ | 編輯頁草稿模式；`game_access_codes` 表 |
| 創作者設定顯示鎖定平台費 | ✓ | `/settings/creator` 各遊戲列表 |
| 帳單地址 Billing address | ✓ | `/settings/billing` → `profiles.billing_*` |
| 創作者 API 金鑰 | ✓ | `/settings/api` → `creator_api_keys` |
| API keys | ✓ | 同上 |
| Billing address | ✓ | 同上 |

Migration: `npm run db:billing-api-keys`

### Phase D — 創作者 API v1（已實作）

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/v1/creator/games` | GET | 遊戲清單（`?ownedOnly=true` 僅已綁定） |
| `/api/v1/creator/games` | POST | 上傳遊戲（multipart，需 API 金鑰） |
| `/api/v1/creator/analytics` | GET | 分析（`scope`, `range`） |
| `/api/v1/creator/revenue` | GET | 收益（`scope`） |

認證：`Authorization: Bearer np_live_…` 或 session cookie（POST 上傳僅 API 金鑰）。文件見 `/settings/api`。

### Phase F — 收據、Webhook、API 寫入（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 打賞收據（帳單地址快照） | ✓ | `game_tips.billing_snapshot`；結帳讀 `/settings/billing` |
| 收據 API | ✓ | `GET /api/games/tips/[tipId]/receipt` |
| Stripe payout webhook | ✓ | `payout.paid` / `failed` / `canceled` / `updated` |
| 提領失敗回補餘額 | ✓ | webhook `processing` → `failed` 時還原 ledger |
| API v1 上傳 | ✓ | `POST /api/v1/creator/games`（multipart） |

Migration: `npm run db:tip-receipt`

### Phase G — 金流上線前必做（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| Webhook：付款失敗 | ✓ | `payment_intent.payment_failed` → tip `failed` |
| Webhook：退款 | ✓ | `charge.refunded` → tip `refunded` + 回補創作者餘額 |
| Webhook：Connect 狀態 | ✓ | `account.updated` → 同步 `payout_status` |
| 玩家打賞紀錄 | ✓ | `/settings/payment`；`GET /api/auth/tips` |
| 資料匯出（金流） | ✓ | tips、payouts、billing 納入 export JSON |
| 私隱政策 | ✓ | `/legal#privacy` |

**Stripe Dashboard 請監聽：** `payment_intent.succeeded`、`payment_intent.payment_failed`、`charge.refunded`、`account.updated`、payout 事件（Connect）

### Phase H — 上線就緒（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 2FA（TOTP） | ✓ | `/settings/security`；需 Supabase MFA 啟用 |
| Email 收據 | ✓ | Resend；`lib/tip-receipt-email.ts` |
| Admin 餘額對帳 | ✓ | `/admin` → 金流對帳 |
| Admin 打賞退款 | ✓ | `POST /api/admin/tips/[id]/refund` |
| API v1 PATCH/DELETE | ✓ | `/api/v1/creator/games/[id]` |
| HK 上線清單 | ✓ | `docs/hk-stripe-launch-checklist.md` |

### Phase I — 體驗與營運（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 儲存信用卡 | ✓ | `/settings/payment`；SetupIntent 新增／移除 |
| 創作者打賞通知 | ✓ | Email + 後台未讀 badge；`unread_tip_count` |
| 2FA 登入挑戰 | ✓ | 登入後 AAL2 驗證；`/auth` |
| 創作者公開頁 | ✓ | `/creator/[id]` |
| 支持者牆 | ✓ | 遊戲頁 Supporter Wall |
| 平台公告橫幅 | ✓ | 全站 banner；`/admin` → 平台公告 |
| Stripe dispute webhook | ✓ | `charge.dispute.created` |

Migration: `npm run db:phase-i-platform`

**Stripe Dashboard 請追加監聽：** `charge.dispute.created`

### Phase J — 金流體驗與通知（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 打賞使用已存卡 | ✓ | 遊戲頁打賞 modal；可選已存卡或新卡 |
| 創作者打賞 Email 開關 | ✓ | `/settings/creator`；`tip_notify_email` |
| 論壇回覆 Email | ✓ | `/settings` 通知；`forum_reply_notify_email` |
| 公告排程 | ✓ | `/admin` → 平台公告；`starts_at` / `ends_at` |

Migration: `npm run db:phase-j-platform`

### Phase K — 社群留存（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 遊戲收藏 | ✓ | 遊戲頁收藏按鈕；`/settings/favorites` |
| 追蹤創作者 | ✓ | `/creator/[id]` 追蹤；`/settings/following` |
| 打賞匿名 | ✓ | 打賞 modal 勾選；支持者牆隱藏名稱 |

Migration: `npm run db:phase-k-platform`

### Phase L — 留存深化（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 首頁我的收藏 | ✓ | 登入後首頁個人化區塊 |
| 首頁追蹤動態 | ✓ | 追蹤創作者的最新公開作品 |
| 追蹤新作 Email | ✓ | `/settings` 通知；遊戲首次上線時觸發 |
| 收藏／追蹤數量 | ✓ | 遊戲頁收藏數；`GET /api/games/[id]/social-stats` |

Migration: `npm run db:phase-l-platform`

### Phase M — 站內通知與社交展示（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 站內通知中心 | ✓ | 鈴鐺 dropdown + `/notifications` |
| 打賞／論壇／新作站內通知 | ✓ | `user_notifications` 表；寫入既有 notify 流程 |
| 首頁卡片真實收藏數 | ✓ | `GET /api/games/social-stats?ids=` batch |
| 追蹤新作站內 badge | ✓ | 首頁「追蹤創作者新作」區塊未讀 badge |

Migration: `npm run db:phase-m-platform`

### Phase N — 通知偏好與首頁互動（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 站內通知偏好 | ✓ | Email 與站內可獨立開關 |
| 打賞站內通知開關 | ✓ | `/settings/creator` |
| 論壇／追蹤新作站內開關 | ✓ | `/settings` 通知區 |
| 首頁收藏一鍵切換 | ✓ | 遊戲卡片愛心按鈕 |
| 追蹤新作 badge 清除 | ✓ | 查看追蹤動態後標已讀 |

Migration: `npm run db:phase-n-platform`

### Phase O — 通知篩選與收藏體驗統一（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 通知中心分類篩選 | ✓ | `/notifications` + 鈴鐺 dropdown |
| API 按類型查詢 | ✓ | `GET /api/auth/notifications?kind=` |
| Featured 真實收藏數 | ✓ | 精選區塊 + 一鍵收藏 |
| 個人化列收藏數 | ✓ | 我的收藏／追蹤動態橫列 |
| 收藏 hook 共用 | ✓ | `hooks/use-game-favorite-actions.ts` |

### Phase P — 全站搜尋與創作者頁社交（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 全站搜尋 API | ✓ | `GET /api/search?q=` |
| 搜尋結果頁 | ✓ | `/search?q=` |
| 首頁搜尋列 | ✓ | `SiteSearch` → 跳轉結果頁 |
| 創作者頁收藏數 | ✓ | 作品卡片顯示真實收藏數 |

### Phase Q — 搜尋體驗深化（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 手機搜尋入口 | ✓ | 導覽列搜尋圖示 → `/search` |
| 最近搜尋紀錄 | ✓ | localStorage；搜尋頁快速重搜 |
| 論壇關鍵字搜尋 | ✓ | 社群討論區標題／內容／作者 |

### Phase R — SEO 與搜尋建議（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| Sitemap | ✓ | `/sitemap.xml` — 公開遊戲與創作者頁 |
| Robots.txt | ✓ | `/robots.txt` — 排除後台／設定 |
| 熱門搜尋快捷 | ✓ | 搜尋頁分類／標籤 chip |
| 搜尋即時建議 | ✓ | `SiteSearch` 輸入 dropdown |

### Phase S — 頁面 SEO 與熱門搜尋（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 遊戲頁 metadata + OG | ✓ | `app/[locale]/game/[id]/layout.tsx` |
| 創作者頁 metadata + OG | ✓ | `app/[locale]/creator/[id]/layout.tsx` |
| 搜尋頁 metadata | ✓ | `app/[locale]/search/page.tsx` |
| 全站 metadataBase | ✓ | `app/[locale]/layout.tsx` |
| 熱門搜尋 API | ✓ | `GET /api/search/popular` |
| 動態熱門 chip | ✓ | `SearchShortcuts` 依遊玩量加權 |

### Phase T — 結構化資料與首頁 SEO（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 首頁 metadata + OG | ✓ | `app/[locale]/page.tsx` |
| 社群頁 metadata | ✓ | `app/[locale]/community/layout.tsx` |
| WebSite JSON-LD | ✓ | 首頁 SearchAction |
| VideoGame JSON-LD | ✓ | 遊戲頁 layout |
| Person JSON-LD | ✓ | 創作者頁 layout |

### Phase U — hreflang、OG 預覽與 Manifest（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 多語言 hreflang | ✓ | `lib/page-metadata.ts` — 全公開頁 |
| 預設 OG 圖 | ✓ | `app/[locale]/opengraph-image.tsx` |
| 遊戲 OG 圖 | ✓ | `app/[locale]/game/[id]/opengraph-image.tsx` |
| Web App Manifest | ✓ | `app/manifest.ts` |
| 站點圖示 | ✓ | `app/icon.tsx`、`app/apple-icon.tsx` |

### Phase V — RSS、創作者 OG 與 Web Push（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| RSS 新作 feed | ✓ | `GET /feed.xml` |
| 頁尾 RSS 連結 | ✓ | `SiteFooter` |
| 創作者 OG 圖 | ✓ | `creator/[id]/opengraph-image.tsx` |
| Web Push 訂閱 | ✓ | `push_subscriptions` 表；`/settings` |
| 推播送達 | ✓ | 站內通知建立時同步推送 |

Migration: `npm run db:phase-v-platform`

### Phase W — 擴展 RSS 與推播分類（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 論壇 RSS | ✓ | `GET /feed/forum.xml` |
| 創作者 RSS | ✓ | `GET /feed/creator/[id]` |
| RSS 入口連結 | ✓ | 社群頁、創作者頁、頁尾 |
| 推播分類開關 | ✓ | 討論／追蹤新作（`/settings`） |
| 打賞推播開關 | ✓ | 創作者 `/settings/creator` |

Migration: `npm run db:phase-w-platform`

### Phase X — 單遊戲 Feed、Atom 與推播測試（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 單遊戲 RSS/Atom | ✓ | `GET /feed/game/[id]`（`?format=atom`） |
| 全站 Atom feed | ✓ | `GET /feed.atom.xml` |
| 遊戲論壇 RSS 入口 | ✓ | 遊戲討論區頁 |
| 推播測試 | ✓ | `POST /api/auth/push/test`；設定頁按鈕 |

### Phase Y — 分類 RSS、Feed 聚合與 Email 摘要（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 分類 RSS | ✓ | `GET /feed/category/[category]` |
| Feed 聚合頁 | ✓ | `/feeds`；頁尾「訂閱中心」 |
| 論壇 Email 摘要偏好 | ✓ | `profiles.forum_email_digest`；`/settings` |
| 摘要預覽 API | ✓ | `GET /api/auth/forum-digest/preview` |
| 摘要預覽 UI | ✓ | 設定頁（開啟摘要後顯示） |

Migration: `npm run db:phase-y-platform`

### Phase Z — 摘要排程、分類 Atom 與 Feed 統計（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 論壇摘要 Cron | ✓ | `GET /api/cron/forum-digest`（需 `CRON_SECRET`） |
| Vercel Cron | ✓ | 每週一 09:00 HKT（`vercel.json`） |
| 摘要依追蹤創作者過濾 | ✓ | `buildForumDigestPreview(userId)` |
| 寄送紀錄 | ✓ | `profiles.forum_digest_last_sent_at` |
| 分類 Atom 入口 | ✓ | `/feeds` 各分類 RSS · Atom 連結 |
| Feed 統計 | ✓ | `/feeds` 顯示；`GET /api/feeds/stats` |

Migration: `npm run db:phase-z-platform`

環境變數：`CRON_SECRET`（Vercel 自動帶 Bearer token）、`RESEND_API_KEY` + `EMAIL_FROM`

### Phase AA — 退訂連結、OPML 與創作者 Atom（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 摘要退訂連結 | ✓ | 摘要 Email 底部；HMAC token（90 天有效） |
| 退訂頁 | ✓ | `/unsubscribe/forum-digest?token=…` |
| OPML 匯出 | ✓ | `GET /feeds.opml`；`/feeds` 與頁尾入口 |
| 創作者 Atom | ✓ | `GET /feed/creator/[id]?format=atom`；創作者頁連結 |

環境變數：`EMAIL_UNSUBSCRIBE_SECRET`（可選，預設沿用 `CRON_SECRET`）

### Phase AB — 論壇 Atom、Feed 快取與摘要多語（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 論壇 Atom | ✓ | `GET /feed/forum.xml?format=atom`；社群頁、/feeds、OPML |
| Feed ETag / 304 | ✓ | 所有 RSS/Atom/OPML 路由；`s-maxage=600` |
| 摘要多語 | ✓ | `forumDigestEmail` 文案；依 `profiles.preferred_locale` |
| 語系偏好同步 | ✓ | 設定頁切換語言 → `PATCH /api/auth/locale` |

Migration: `npm run db:phase-ab-platform`

### Phase AC — Feed 統一、Discovery 與摘要寄送紀錄（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 全站 Atom 參數化 | ✓ | `GET /feed.xml?format=atom`（`/feed.atom.xml` 仍可用） |
| Feed discovery 標籤 | ✓ | 遊戲／創作者／社群／feeds 頁 `<link rel="alternate">` |
| 摘要寄送紀錄 | ✓ | `forum_digest_deliveries` 表 |
| 寄送紀錄 API | ✓ | `GET /api/auth/forum-digest/history` |
| 設定頁紀錄 UI | ✓ | `/settings` 摘要區塊 |

Migration: `npm run db:phase-ac-platform`

### Phase AD — Atom 重定向、管理員摘要報表與 WebSub（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| Atom 308 重定向 | ✓ | `/feed.atom.xml` → `/feed.xml?format=atom` |
| 管理員摘要報表 | ✓ | `GET /api/admin/forum-digest/report`；Admin「摘要報表」分頁 |
| WebSub Hub 連結 | ✓ | Atom feed 含 `rel="hub"`（需 `WEBSUB_HUB_URL`） |
| WebSub 發布 ping | ✓ | 遊戲審批通過時；`GET /api/cron/websub-ping` |

環境變數：`WEBSUB_HUB_URL`（可選，如 Google PubSubHubbub）

### Phase AE — WebSub 回調、摘要重試與 Feed JSON 預覽（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| WebSub 訂閱回調 | ✓ | `GET/POST /api/websub/callback` — hub 驗證與更新通知 |
| WebSub 自動續訂 | ✓ | `GET /api/cron/websub-subscribe`；`websub_subscriptions` 表 |
| 摘要重試佇列 | ✓ | 寄送失敗入列；`GET /api/cron/forum-digest-retry` |
| Feed JSON 預覽 | ✓ | `GET /api/feeds/preview?feed=games\|forum\|…` |
| 訂閱中心預覽 UI | ✓ | `/feeds` 顯示最新 5 則 |
| Admin WebSub／重試 | ✓ | 摘要報表分頁顯示待重試與 WebSub 狀態 |

Migration: `npm run db:phase-ae-platform`

### Phase AF — Admin 營運與分類預覽（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| Admin 摘要重試 | ✓ | `POST /api/admin/forum-digest/retry` |
| Admin WebSub 續訂／Ping | ✓ | `POST /api/admin/websub/subscribe`、`/ping` |
| 分類 Feed 預覽 UI | ✓ | `/feeds` 分類下拉 + JSON 連結 |
| 重試佇列列表 | ✓ | Admin 摘要報表顯示待重試項目 |

### Phase AG — Feed 目錄與論壇 WebSub（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| Feed 目錄 API | ✓ | `GET /api/feeds/catalog` — 全站 feed URL 清單 |
| 論壇貼文 WebSub ping | ✓ | 新貼文觸發論壇 feed ping |
| 遊戲／創作者 JSON 連結 | ✓ | 論壇頁、創作者頁 preview 連結 |

### Phase AH — Feed 健康檢查（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| Feed 健康 API | ✓ | `GET /api/feeds/health` |
| Admin 健康狀態 | ✓ | 摘要報表分頁顯示各 feed 探測結果 |
| 訂閱中心入口 | ✓ | `/feeds` 連結 catalog／health |

> **Feed／WebSub／Email 摘要全線完成（Phase R–AH）**。後續擴展請依 itch.io 對照表 Phase A–E 金流與帳戶功能為主。

### Phase E — 創作者提領（已實作）

| 功能 | 狀態 | 路徑／備註 |
|------|------|-----------|
| 提領門檻 $25 | ✓ | `MIN_PAYOUT_THRESHOLD_USD` |
| 預覽模式模擬提領 | ✓ | `POST /api/auth/payout/withdraw` |
| Stripe Connect 真實 payout | ✓ | `stripe.payouts.create` on connected account |
| 提領紀錄 | ✓ | `creator_payouts` 表；`/settings/payout` 歷史 |

Migration: `npm run db:payout-withdrawals`

### 不必抄 itch.io

- Revenue sharing slider（已有全站鎖定 + grandfather）
- 雙收款模式
- Partner access（初期）

## 帳戶設定路由結構

```
/profile              個人資料（頭像、名稱、社交連結）
/settings             外觀、語言、通知、遊戲體驗
/settings/security    密碼
/settings/privacy     公開資料、排行榜可見性
/settings/creator     支援信箱、平台費說明（僅創作者）
/settings/payout    Stripe Connect 收款（僅創作者）
/settings/payment     玩家付款方式
/settings/billing     帳單地址（收據／發票）
/settings/api         創作者 API 金鑰
/settings/data        資料匯出、刪除帳戶
/legal                條款、付款政策
```

## 上傳系統（Phase 1 已完成）

- Genre & Tags、Viewport、AI 披露、Rich Text（TipTap）
- 路徑：`app/[locale]/dashboard/upload/page.tsx`
- Metadata：`supabase/game-publish-metadata.sql`

## 打賞與收益（已上線）

- 真實打賞：`components/game/tip-support-panel.tsx`、`game_tips` 表
- Dashboard 收益：`GET /api/dashboard/revenue`（讀取 `game_tips`，非 mock）
- Stripe 未設定時為 preview 模式；上線後為 Connect destination charge + 0% application fee
- 費用說明：`components/dashboard/tips-fee-disclosure.tsx`
- 法律頁：`app/[locale]/legal/legal-view.tsx`

## 日後調整平台費步驟

1. 修改 `lib/tip-fee-policy.ts` 的 `PLANNED_PLATFORM_FEE_PERCENT`
2. 站內公告 ≥ 30 天
3. 新開打賞的遊戲鎖定新費率；已鎖定的不變
4. 更新 `messages/*` 法律與 dashboard 文案

## 參考連結

- itch.io Open Revenue Sharing：創作者自選 0–100%，預設 10%
- RainyNightFrog 差異：平台決定全站費率，早期 0% 吸創作者
