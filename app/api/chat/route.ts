import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function POST(req: Request) {
  const { message, memories = [] } =
    await req.json();

  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      {
        reply:
          "ERROR: API key not configured.",
      },
      { status: 500 }
    );
  }

  try {
    const memoryContext =
      Array.isArray(memories) &&
      memories.length > 0
        ? memories
            .map(
              (memory: { text?: string }) =>
                `- ${memory.text || ""}`
            )
            .filter(Boolean)
            .join("\n")
        : "No saved memories.";

    /*
     * NORMAL ECHO RESPONSE
     */
    const { text } =
      await generateText({
        model: groq(
          "openai/gpt-oss-120b"
        ),

        system: `You are ECHO, a helpful AI assistant.

Always identify yourself as ECHO when asked your name.

The following are memories the user has explicitly saved for you:

${memoryContext}

Use these memories naturally when relevant.

Do not claim to remember something that is not included in the saved memories.

Do not reveal the internal memory system unless the user asks about it directly.`,

        prompt: message,
      });

    /*
     * MEMORY DETECTION
     */
    const { text: memoryAnalysis } =
      await generateText({
        model: groq(
          "openai/gpt-oss-120b"
        ),

        system: `You identify useful long-term personal information from the user's message.

Only identify information about the user that could be useful in future conversations.

Good examples:
- hobbies
- favorite games
- preferences
- devices they own
- recurring interests
- useful non-sensitive personal preferences

Do NOT create memories from:
- questions
- requests
- jokes
- temporary situations
- information about other people
- sensitive personal information

There is already a list of saved memories:

${memoryContext}

IMPORTANT:

Before suggesting a memory, compare it with the existing memories.

If an existing memory already means essentially the same thing, return exactly:

NONE

Different wording does NOT mean it is a new memory.

For example:

Existing:
User likes Minecraft.

New information:
The user enjoys playing Minecraft.

Return:
NONE

Only return a new memory when the information is genuinely new.

If the message contains genuinely new useful information, return ONE short memory sentence.

Return ONLY the memory sentence or:

NONE`,

        prompt: message,
      });

    const cleanedMemory =
      memoryAnalysis.trim();

    const suggestedMemory =
      cleanedMemory === "NONE" ||
      cleanedMemory.length === 0
        ? null
        : cleanedMemory;

    return Response.json({
      reply: text,
      suggestedMemory,
    });
  } catch (error: unknown) {
    console.error(
      "AI Error:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to process request";

    return Response.json(
      {
        reply:
          `ERROR: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}