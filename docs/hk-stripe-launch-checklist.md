# NexusPlay 香港 Stripe 上線清單

> 營運／合規步驟。程式功能已就緒，上線前請逐項確認。

## 1. 公司與合規（香港）

- [ ] 完成 **BR（商業登記）** 或 **有限公司（Ltd）** 註冊
- [ ] 開立 **公司銀行戶口**（Stripe Connect 提領用）
- [ ] 確認打賞／平台模式符合香港法規（非賭博、非受規管支付服務誤判）
- [ ] 請律師審閱 `/legal` 條款（服務條款、付款、私隱、免責）
- [ ] 準備 **私隱政策** 中提及的資料處理方式（Supabase、Stripe、Resend、GA4）

## 2. Stripe Connect（HK）

- [ ] 在 [Stripe Dashboard](https://dashboard.stripe.com) 開通 **Connect**
- [ ] 設定 Express 帳戶，國家：`HK`（`.env` → `STRIPE_CONNECT_COUNTRY=HK`）
- [ ] 設定 **Webhook** 端點：`https://your-domain/api/webhooks/stripe`
- [ ] 監聽事件：
  - `payment_intent.succeeded` / `payment_intent.payment_failed`
  - `charge.refunded`
  - `account.updated`（Connect）
  - `payout.paid` / `payout.failed` / `payout.canceled` / `payout.updated`
- [ ] 生產環境金鑰寫入 Vercel：
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PAYMENTS_LIVE=true`

## 3. Supabase

- [ ] 執行所有 migration scripts（見 `package.json` 的 `db:*`）
- [ ] 在 **Authentication → MFA** 啟用 **TOTP**（2FA 功能需要）
- [ ] 設定 `SUPABASE_SERVICE_ROLE_KEY`（webhook、email、admin 對帳）
- [ ] RLS 與 service role 僅用於伺服器端

## 4. Email 收據（Resend）

- [ ] 註冊 [Resend](https://resend.com)，驗證寄件域名
- [ ] 設定環境變數：
  - `RESEND_API_KEY=re_...`
  - `EMAIL_FROM=NexusPlay <receipts@your-domain.com>`
- [ ] 測試一筆 live 打賞，確認收到 HTML 收據

## 5. 上線前功能自測

| 流程 | 路徑 |
|------|------|
| 創作者 Connect onboarding | `/settings/payout` |
| 玩家打賞 + 收據 | 遊戲頁 → `/settings/payment` 紀錄 |
| 創作者提領 | `/settings/payout` → withdraw |
| Admin 對帳 | `/admin` → 金流對帳 |
| Admin 退款 | 同上 → 打賞退款 |
| API 上傳/更新/刪除 | `/settings/api` 文件 |
| 2FA | `/settings/security` |
| 資料匯出 | `/settings/data` |

## 6. 上線後監控

- [ ] Stripe Dashboard：爭議、退款、Connect 帳戶 restricted
- [ ] Admin **金流對帳**：ledger 與 Stripe 可用餘額差異
- [ ] 平台費調整時：公告 ≥ 30 天，更新 `lib/tip-fee-policy.ts` 與 `/legal#payments`

## 環境變數速查

```env
# 必填（live）
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PAYMENTS_LIVE=true
SUPABASE_SERVICE_ROLE_KEY=...

# 建議
RESEND_API_KEY=re_...
EMAIL_FROM=NexusPlay <receipts@your-domain.com>
NEXT_PUBLIC_SITE_URL=https://your-domain
STRIPE_CONNECT_COUNTRY=HK
```
