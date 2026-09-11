import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Google account access has been disabled for ECHO.
  return NextResponse.json(
    { connected: false, disabled: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
