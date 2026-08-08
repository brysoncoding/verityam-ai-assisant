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

    /*
     * First generate ECHO's normal response.
     */
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

    /*
     * Phase 2A:
     * Ask the AI whether the user's message contains
     * useful personal information that could be remembered.
     *
     * This does NOT save anything yet.
     */
    const { text: memoryAnalysis } = await generateText({
      model: groq("openai/gpt-oss-120b"),

      system: `You identify useful long-term personal information from user messages.

Only suggest a memory when the user clearly states information about themselves that could reasonably be useful in future conversations.

Examples of useful memories:
- preferences
- hobbies
- favorite games
- devices they own
- recurring interests
- useful personal preferences

Do NOT suggest memories for:
- temporary situations
- questions
- requests
- jokes
- random facts
- information about other people
- sensitive personal information

Return ONLY the memory text.

If there is nothing useful to remember, return exactly:
NONE`,

      prompt: message,
    });

    const suggestedMemory =
      memoryAnalysis.trim() === "NONE"
        ? null
        : memoryAnalysis.trim();

    return Response.json({
      reply: text,
      suggestedMemory,
    });
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
      { status: 500 },
    );
  }
}