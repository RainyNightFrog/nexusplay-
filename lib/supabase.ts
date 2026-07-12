import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export { createClient } from "@/lib/supabase/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function assertSupabaseConfigured() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "缺少 Supabase 環境變數，請在 .env.local 設定 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
}

/** @deprecated 請改用 createClient() from @/lib/supabase/client */
export const supabase = createSupabaseJsClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

export type GameRecord = {
  id: number;
  title: string;
  slug: string | null;
  description: string;
  category: string;
  cover_url: string;
  game_url: string;
  creator_id: string | null;
  created_at: string;
  plays_count: number;
  rating_avg: number;
  publish_status: "draft" | "public";
  tips_enabled: boolean;
  suggested_tip_amount: number | null;
  status: "pending" | "approved" | "rejected";
  gallery_urls?: unknown;
  devlog_entries?: unknown;
  tags?: unknown;
  viewport_width?: number;
  viewport_height?: number;
  fullscreen_button?: boolean;
  ai_disclosed?: boolean | null;
  ai_content_types?: unknown;
  details_html?: string;
  platform_fee_percent?: number | null;
  price?: number;
  currency?: string;
  pricing_type?: "free" | "fixed" | "pwyw";
  min_price?: number;
  on_sale?: boolean;
  is_featured?: boolean;
  featured_badge?: string | null;
  featured_sort?: number;
};
