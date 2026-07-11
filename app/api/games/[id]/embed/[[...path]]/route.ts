import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import { extractBuildPrefixFromPlayUrl } from "@/lib/game-storage";
import { guessContentType } from "@/lib/game-mime";
import { patchHtmlForPlatformEmbed } from "@/lib/embed-html-patch";
import { canViewGame } from "@/lib/game-publish";
import { resolvePurchaseEntitlementForGame } from "@/lib/game-entitlement-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

const FILES_BUCKET = "game-files";

function normalizeAssetPath(segments: string[] | undefined) {
  const joined = (segments ?? []).join("/").replace(/\\/g, "/");
  const trimmed = joined.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed || "index.html";
}

function isSafeAssetPath(assetPath: string) {
  if (!assetPath || assetPath === "." || assetPath === "..") {
    return false;
  }
  const segments = assetPath.split("/");
  return segments.every(
    (segment) => segment && segment !== "." && segment !== ".."
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; path?: string[] }> }
) {
  try {
    const { id, path } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const assetPath = normalizeAssetPath(path);
    if (!isSafeAssetPath(assetPath)) {
      return NextResponse.json({ error: "無效的資源路徑" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: record, error: recordError } = await supabase
      .from("games")
      .select("*")
      .eq("id", numericId)
      .maybeSingle();

    if (recordError) {
      throw new Error(`讀取遊戲失敗：${recordError.message}`);
    }

    if (!record) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const hasPurchaseEntitlement = await resolvePurchaseEntitlementForGame(
      supabase,
      numericId,
      user?.id
    );

    if (
      !canViewGame(record, user?.id, {
        isAdmin: isAdminUser(user),
        hasPurchaseEntitlement,
      })
    ) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const buildPrefix = extractBuildPrefixFromPlayUrl(record.game_url ?? "");
    if (!buildPrefix) {
      return NextResponse.json(
        { error: "此遊戲尚未解壓部署，請重新上傳 zip" },
        { status: 404 }
      );
    }

    const storagePath = `${buildPrefix}/${assetPath}`;
    const { data: publicData } = supabase.storage
      .from(FILES_BUCKET)
      .getPublicUrl(storagePath);

    const upstream = await fetch(publicData.publicUrl, {
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "找不到遊戲資源" }, { status: 404 });
    }

    const body = await upstream.arrayBuffer();
    const contentType = guessContentType(assetPath);

    if (assetPath.toLowerCase().endsWith(".html")) {
      const html = patchHtmlForPlatformEmbed(
        new TextDecoder("utf-8").decode(body)
      );
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "載入遊戲資源失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
