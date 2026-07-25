import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="dark flex min-h-[50vh] flex-col items-center justify-center px-4 text-zinc-100">
      <Loader2 className="mb-3 size-8 animate-spin text-cyan-400" />
      <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
    </div>
  );
}
