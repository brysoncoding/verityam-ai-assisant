import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
  const { message } = await req.json();

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
  } catch (error) {
    console.error("AI Error:", error);
    return Response.json(
      { reply: "ERROR: Unable to process request. Check your API key." },
      { status: 500 }
    );
  }
}