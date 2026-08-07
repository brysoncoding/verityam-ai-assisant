import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { message } = await req.json();

  return NextResponse.json({
    reply: `VERITY received: ${message}`,
  });
}