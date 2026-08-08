import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
  const { message } = await req.json();

  // Check if API key exists
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
    return Response.json(
      { reply: "ERROR: API key not configured. Contact administrator." },
      { status: 500 }
    );
  }

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      system: "You are VERITY, a futuristic AI assistant with a cyberpunk personality. Be helpful, concise, engaging, and respond in a futuristic tone.",
    });

    return Response.json({
      reply: text,
    });
  } catch (error: any) {
    console.error("AI Error:", error?.message);
    return Response.json(
      { reply: "ERROR: " + (error?.message || "Unable to process request") },
      { status: 500 }
    );
  }
}