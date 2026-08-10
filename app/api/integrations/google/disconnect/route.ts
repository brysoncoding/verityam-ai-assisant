import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decryptGoogleTokens } from "../../../../lib/google-oauth";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const stored = cookieStore.get("echo-google-tokens")?.value;

  if (stored) {
    try {
      const tokens = await decryptGoogleTokens(stored);
      const tokenToRevoke = tokens.refreshToken || tokens.accessToken;
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: tokenToRevoke }),
        cache: "no-store",
      });
    } catch {
      // Always remove ECHO's local authorization even if Google's revoke endpoint fails.
    }
  }

  const response = NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete("echo-google-tokens");
  return response;
}
