export function AccountContentSkeleton({
  rows = 4,
}: {
  rows?: number;
}) {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-64 max-w-full animate-pulse rounded bg-zinc-800/80" />
      <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-11 animate-pulse rounded-lg bg-zinc-800/80"
          />
        ))}
      </div>
    </div>
  );
}
