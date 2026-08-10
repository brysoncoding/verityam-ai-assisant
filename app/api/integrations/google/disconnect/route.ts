import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete("echo-google-tokens");
  return response;
}
