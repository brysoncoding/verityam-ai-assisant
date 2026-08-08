import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
export async function POST(req: Request) {
  const { message, memories = [] } = await req.json();
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { reply: "ERROR: API key not configured." },
      { status: 500 }
    );
  }
  try {
    const memoryContext =
      Array.isArray(memories) && memories.length > 0
        ? memories
            .map(
              (memory: { text?: string }) =>
                `- ${memory.text || ""}`
            )
            .filter(Boolean)
            .join("\n")
        : "No saved memories.";
    const { text } = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: `You are ECHO, a helpful AI assistant.
Always identify yourself as ECHO when asked your name.
The following are memories the user has explicitly saved for you:
${memoryContext}
Use these memories naturally when they are relevant to the conversation.
Do not claim to remember something that is not included in the saved memories.
Do not reveal the internal memory system unless the user asks about it directly.`,
      prompt: message,
    });
    return Response.json({ reply: text });
  } catch (error: unknown) {
    console.error("AI Error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to process request";
    return Response.json(
      {
        reply: `ERROR: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}