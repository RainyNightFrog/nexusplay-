import { NextResponse } from "next/server";
import {
  LOCAL_SITE_URL,
  PRODUCTION_SITE_URL,
  mergeAuthRedirectAllowList,
} from "@/lib/auth-redirect-urls";

const PROJECT_REF = "icydkixwynxizrgfzelq";

function isSetupAllowed() {
  if (process.env.ENABLE_OAUTH_SETUP === "true") {
    return true;
  }
  return (
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview"
  );
}

export async function POST(request: Request) {
  if (!isSetupAllowed()) {
    return NextResponse.json({ error: "此設定 API 僅限開發環境使用" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      accessToken?: string;
      clientId?: string;
      clientSecret?: string;
      siteUrl?: string;
      patchUrlsOnly?: boolean;
    };

    const accessToken = body.accessToken?.trim();
    const clientId = body.clientId?.trim();
    const clientSecret = body.clientSecret?.trim();
    const siteUrl = body.siteUrl?.trim() || PRODUCTION_SITE_URL;
    const patchUrlsOnly = body.patchUrlsOnly === true;

    if (!accessToken) {
      return NextResponse.json(
        { error: "請填寫 Supabase Access Token" },
        { status: 400 }
      );
    }

    if (!patchUrlsOnly && (!clientId || !clientSecret)) {
      return NextResponse.json(
        { error: "請填寫 Discord Client ID 與 Client Secret" },
        { status: 400 }
      );
    }

    const currentConfigResponse = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const currentConfigText = await currentConfigResponse.text();
    const currentConfig = JSON.parse(currentConfigText) as {
      message?: string;
      uri_allow_list?: string;
    };

    if (!currentConfigResponse.ok) {
      return NextResponse.json(
        {
          error:
            currentConfig.message ??
            `Supabase API 失敗 (${currentConfigResponse.status})`,
        },
        { status: 502 }
      );
    }

    const patchBody: Record<string, unknown> = {
      site_url: siteUrl,
      uri_allow_list: mergeAuthRedirectAllowList(
        currentConfig.uri_allow_list,
        siteUrl
      ),
    };

    if (!patchUrlsOnly) {
      patchBody.external_discord_enabled = true;
      patchBody.external_discord_client_id = clientId;
      patchBody.external_discord_secret = clientSecret;
    }

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchBody),
      }
    );

    const text = await response.text();
    let payload: { message?: string } = {};
    try {
      payload = JSON.parse(text) as { message?: string };
    } catch {
      payload = { message: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            payload.message ??
            `Supabase API 失敗 (${response.status})，請確認 Access Token 是否有效`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      redirectUri: `https://${PROJECT_REF}.supabase.co/auth/v1/callback`,
      siteUrl,
      redirectUrls: patchBody.uri_allow_list,
      localSiteUrl: LOCAL_SITE_URL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "設定失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
