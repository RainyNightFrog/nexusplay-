import { NextResponse } from "next/server";

const PROJECT_REF = "icydkixwynxizrgfzelq";
const SITE_URL = "http://localhost:3000";
const LOCAL_CALLBACK = "http://localhost:3000/auth/callback";

function isSetupAllowed() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_OAUTH_SETUP === "true"
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
    };

    const accessToken = body.accessToken?.trim();
    const clientId = body.clientId?.trim();
    const clientSecret = body.clientSecret?.trim();

    if (!accessToken || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: "請填寫 Supabase Access Token、Google Client ID 與 Client Secret" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_google_enabled: true,
          external_google_client_id: clientId,
          external_google_secret: clientSecret,
          site_url: SITE_URL,
          uri_allow_list: LOCAL_CALLBACK,
        }),
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
      siteUrl: SITE_URL,
      callbackUrl: LOCAL_CALLBACK,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "設定失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
