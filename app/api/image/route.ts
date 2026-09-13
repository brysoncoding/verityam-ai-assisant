import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PROMPT_CHARS = 4000;
const REPLICATE_MODEL = "black-forest-labs/flux-1.1-pro";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Tell ECHO what image you want created." }, { status: 400 });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Image generation is not configured yet. Add REPLICATE_API_TOKEN to the production environment." },
        { status: 503 },
      );
    }

    const response = await fetch(
      `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt: prompt.slice(0, MAX_PROMPT_CHARS),
          },
        }),
      },
    );

    const payload = (await response.json()) as {
      output?: string | string[];
      error?: string;
      status?: string;
    };

    if (!response.ok) {
      console.error("ECHO image generation error:", payload.error || response.statusText);
      return NextResponse.json(
        { error: payload.error || "The image service could not create that image." },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      );
    }

    const output = Array.isArray(payload.output) ? payload.output[0] : payload.output;
    if (!output) {
      return NextResponse.json(
        { error: "The image service did not return an image. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      imageUrl: output,
      prompt,
    });
  } catch (error) {
    console.error("ECHO image route error:", error);
    return NextResponse.json({ error: "ECHO could not create the image right now." }, { status: 500 });
  }
}
