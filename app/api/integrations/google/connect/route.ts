import { NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "../../../../lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const state = crypto.randomUUID();
    const authorizationUrl = buildGoogleAuthorizationUrl(state);
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set("echo-google-oauth-state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });
    return response;
  } catch {
    const url = new URL("/permissions", request.url);
    url.searchParams.set("google", "configuration-error");
    return NextResponse.redirect(url);
  }
}
