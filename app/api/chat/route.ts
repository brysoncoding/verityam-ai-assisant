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
      model: groq("openai/gpt-oss-120b"),
prompt: message,
instructions:
  "You are ECHO, a helpful AI assistant. Always identify yourself as ECHO when asked your name.",
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