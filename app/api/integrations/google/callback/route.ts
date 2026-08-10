import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptGoogleTokens, exchangeGoogleCode } from "../../../../lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const savedState = cookieStore.get("echo-google-oauth-state")?.value;

  const redirect = (status: string) => {
    const url = new URL("/permissions", request.url);
    url.searchParams.set("google", status);
    const response = NextResponse.redirect(url);
    response.cookies.delete("echo-google-oauth-state");
    return response;
  };

  if (oauthError) return redirect("denied");
  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return redirect("invalid-state");
  }

  try {
    const tokenResponse = await exchangeGoogleCode(code);
    if (!tokenResponse.refresh_token) return redirect("missing-refresh-token");

    const encryptedTokens = await encryptGoogleTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    });

    const response = redirect("connected");
    response.cookies.set("echo-google-tokens", encryptedTokens, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch {
    return redirect("error");
  }
}
