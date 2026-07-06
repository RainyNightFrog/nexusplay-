"use client";

import { useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROJECT_REF = "icydkixwynxizrgfzelq";
const GOOGLE_REDIRECT_URI = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;

const LINKS = {
  googleConsent: "https://console.cloud.google.com/auth/overview",
  googleClients: "https://console.cloud.google.com/auth/clients",
  supabaseToken: "https://supabase.com/dashboard/account/tokens",
  supabaseGoogle: `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/providers?provider=Google`,
};

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function SetupGooglePage() {
  const [accessToken, setAccessToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [patchUrlsOnly, setPatchUrlsOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dev/configure-google-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          clientId,
          clientSecret,
          patchUrlsOnly,
          siteUrl: "https://nexusplay-five.vercel.app",
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "設定失敗");
      }

      setDone(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "設定失敗"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark mx-auto min-h-full max-w-xl px-4 py-10 text-zinc-100">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-2xl font-bold text-white">Google 登入一鍵設定</h1>
        <p className="text-sm text-zinc-400">
          Google 後台需你本人登入一次；貼上 3 個值後，其餘由系統自動完成。
        </p>
      </div>

      <ol className="mb-8 space-y-4 text-sm text-zinc-300">
        <li className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-medium text-white">① Google OAuth 同意畫面</p>
          <p className="mt-1 text-zinc-400">
            外部 → 名稱 NexusPlay → 測試使用者加入你的 Gmail
          </p>
          <a
            href={LINKS.googleConsent}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-cyan-400 hover:underline"
          >
            開啟 Google 同意畫面 <ExternalLink className="size-3.5" />
          </a>
        </li>

        <li className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-medium text-white">② 建立 OAuth 用戶端</p>
          <p className="mt-1 text-zinc-400">
            網頁應用程式 → 重新導向 URI 貼下面這行：
          </p>
          <code className="mt-2 block break-all rounded-lg bg-black/40 px-3 py-2 text-xs text-cyan-200">
            {GOOGLE_REDIRECT_URI}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 border-white/15 bg-white/5"
            onClick={async () => {
              await copyText(GOOGLE_REDIRECT_URI);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy className="size-3.5" />
            {copied ? "已複製" : "複製 Redirect URI"}
          </Button>
          <a
            href={LINKS.googleClients}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 inline-flex items-center gap-1 text-cyan-400 hover:underline"
          >
            開啟 Google 用戶端 <ExternalLink className="size-3.5" />
          </a>
        </li>

        <li className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-medium text-white">③ Supabase Access Token</p>
          <a
            href={LINKS.supabaseToken}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-cyan-400 hover:underline"
          >
            建立 Token <ExternalLink className="size-3.5" />
          </a>
        </li>
      </ol>

      {done ? (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-400" />
          <p className="font-semibold text-white">Google 登入已設定完成！</p>
          <p className="mt-2 text-sm text-zinc-400">
            前往登入頁測試「使用 Google 登入」
          </p>
          <Link href="/auth" className="mt-4 inline-block">
            <Button className="mt-2">前往登入頁</Button>
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="accessToken">Supabase Access Token</Label>
            <Input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="sbp_..."
              className="border-white/10 bg-white/5"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientId">Google Client ID</Label>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-abc.apps.googleusercontent.com"
              className="border-white/10 bg-white/5"
              required={!patchUrlsOnly}
              disabled={patchUrlsOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientSecret">Google Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-..."
              className="border-white/10 bg-white/5"
              required={!patchUrlsOnly}
              disabled={patchUrlsOnly}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={patchUrlsOnly}
              onChange={(event) => setPatchUrlsOnly(event.target.checked)}
            />
            僅更新正式站 Auth URL（修復登入導向 localhost 問題）
          </label>

          {error && (
            <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                正在設定 Supabase…
              </>
            ) : (
              "一鍵完成 Google 登入設定"
            )}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-zinc-500">
        此頁僅供開發設定，正式環境請在 Supabase Dashboard 手動設定。
      </p>
    </div>
  );
}
