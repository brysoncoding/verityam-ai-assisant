import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const connected = Boolean(cookieStore.get("echo-google-tokens")?.value);

  return NextResponse.json({ connected }, { headers: { "Cache-Control": "no-store" } });
}
