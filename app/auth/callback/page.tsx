import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthCallbackClient } from "./auth-callback-client";

function AuthCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-zinc-100">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4">
        <Loader2 className="size-5 animate-spin text-cyan-400" />
        <p className="text-sm text-zinc-300">正在完成登入…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
