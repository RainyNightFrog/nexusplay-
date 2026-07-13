import { NextResponse } from "next/server";
import { computePricingReferenceStats } from "@/lib/creator-tools/pricing-reference";
import { createServerSupabase } from "@/lib/supabase-server";
import { GAME_GENRES } from "@/lib/game-metadata";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre")?.trim() ?? "";
    const tag = searchParams.get("tag")?.trim() ?? "";

    const supabase = createServerSupabase();
    let query = supabase
      .from("games")
      .select("pricing_type, price, min_price")
      .eq("publish_status", "public")
      .eq("status", "approved");

    if (genre && (GAME_GENRES as readonly string[]).includes(genre)) {
      query = query.eq("category", genre);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query.limit(500);

    if (error) {
      throw error;
    }

    const stats = computePricingReferenceStats(
      (data ?? []).map((row) => ({
        pricing_type: row.pricing_type as "free" | "fixed" | "pwyw",
        price: row.price,
        min_price: row.min_price,
      }))
    );

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "pricing_reference_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
