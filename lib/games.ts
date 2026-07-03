export type Game = {
  id: number;
  title: string;
  tags: string[];
  players: string;
  image: string;
  creator: string;
  description: string;
  embedUrl: string;
};

export const TAG_COLORS: Record<string, string> = {
  "3D": "bg-violet-500/20 text-violet-300 ring-violet-500/30",
  "2D": "bg-sky-500/20 text-sky-300 ring-sky-500/30",
  動作: "bg-rose-500/20 text-rose-300 ring-rose-500/30",
  益智: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  多人: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  RPG: "bg-fuchsia-500/20 text-fuchsia-300 ring-fuchsia-500/30",
  競速: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
  休閒: "bg-teal-500/20 text-teal-300 ring-teal-500/30",
  射擊: "bg-red-500/20 text-red-300 ring-red-500/30",
  冒險: "bg-indigo-500/20 text-indigo-300 ring-indigo-500/30",
};

export function isSupabaseImage(url: string) {
  return url.includes(".supabase.co/storage/");
}
