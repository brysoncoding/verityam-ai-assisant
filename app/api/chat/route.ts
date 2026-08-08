import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function POST(req: Request) {
  const { message } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { reply: "ERROR: API key not configured." },
      { status: 500 }
    );
  }

  try {
    const { text } = await generateText({
      model: groq("llama-3.1-70b-versatile"),
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      system: "You are VERITY, a futuristic AI assistant with a cyberpunk personality. Be helpful, concise, engaging, and respond in a futuristic tone.",
    });

    return Response.json({ reply: text });
  } catch (error: any) {
    console.error("AI Error:", error?.message);
    return Response.json(
      { reply: "ERROR: " + (error?.message || "Unable to process request") },
      { status: 500 }
    );
  }
}