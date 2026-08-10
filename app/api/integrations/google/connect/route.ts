import { NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "../../../../../lib/google-oauth";

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth is not configured";
    const url = new URL("/", request.url);
    url.searchParams.set("google", "configuration-error");
    url.searchParams.set("message", message);
    return NextResponse.redirect(url);
  }
}
