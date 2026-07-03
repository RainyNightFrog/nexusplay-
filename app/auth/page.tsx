import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AuthPage from "./auth-page";

function AuthFallback() {
  return (
    <div className="dark flex min-h-full items-center justify-center bg-zinc-950">
      <Loader2 className="size-8 animate-spin text-cyan-400" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthPage />
    </Suspense>
  );
}
