import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PROMPT_CHARS = 4000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Tell ECHO what image you want created." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Image generation is not configured yet. Add OPENAI_API_KEY to the production environment." },
        { status: 503 },
      );
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: prompt.slice(0, MAX_PROMPT_CHARS),
        size: "auto",
        quality: "auto",
        output_format: "png",
      }),
    });

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("ECHO image generation error:", payload.error?.message || response.statusText);
      return NextResponse.json(
        { error: payload.error?.message || "The image service could not create that image." },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      );
    }

    const image = payload.data?.[0];
    if (!image?.b64_json && !image?.url) {
      return NextResponse.json({ error: "The image service returned no image." }, { status: 502 });
    }

    return NextResponse.json({
      imageUrl: image.b64_json ? `data:image/png;base64,${image.b64_json}` : image.url,
      prompt,
    });
  } catch (error) {
    console.error("ECHO image route error:", error);
    return NextResponse.json({ error: "ECHO could not create the image right now." }, { status: 500 });
  }
}
