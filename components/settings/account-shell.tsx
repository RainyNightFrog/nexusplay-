import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AccountShellProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
};

export function AccountShell({
  title,
  description,
  backHref = "/",
  backLabel = "返回首頁",
  children,
}: AccountShellProps) {
  return (
    <div className="dark relative min-h-full text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 max-w-3xl items-center justify-center px-4 sm:px-6">
          <Link
            href={backHref}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "absolute left-4 gap-1.5 text-zinc-400 hover:text-cyan-300 sm:left-6"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600">
              <Gamepad2 className="size-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">NexusPlay</span>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

export const accountInputClassName = cn(
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm text-zinc-100",
  "placeholder:text-zinc-500 outline-none transition-all",
  "focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
);

export const accountLabelClassName = "block text-center text-zinc-300";

export const accountFieldClassName = "space-y-2 text-center";

export const accountCardClassName = cn(
  "rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center sm:p-8",
  "shadow-xl shadow-black/40 backdrop-blur-sm"
);

export const accountSectionTitleClassName = cn(
  "flex items-center justify-center gap-2 text-sm font-semibold text-white"
);

export const settingsToggleRowClassName = cn(
  "flex cursor-pointer items-start gap-4 rounded-xl border border-white/8",
  "bg-white/[0.02] p-4 text-left transition-colors hover:border-violet-400/20"
);
