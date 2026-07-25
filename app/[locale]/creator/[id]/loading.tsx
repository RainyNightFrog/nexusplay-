import { SiteHeader } from "@/components/layout/site-header";

export default function Loading() {
  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="size-20 animate-pulse rounded-2xl bg-zinc-800" />
          <div className="w-full max-w-sm space-y-3">
            <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-xl bg-zinc-900"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
