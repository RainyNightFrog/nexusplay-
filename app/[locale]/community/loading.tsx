export default function Loading() {
  return (
    <div className="dark mx-auto max-w-5xl space-y-4 px-4 py-10 text-zinc-100 sm:px-6">
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-64 max-w-full animate-pulse rounded bg-zinc-800/80" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
