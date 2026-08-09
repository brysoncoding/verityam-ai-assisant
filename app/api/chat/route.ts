import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

const MEMORY_CATEGORIES = [
  "PREFERENCE",
  "HOBBY",
  "PROJECT",
  "DEVICE",
  "GOAL",
  "OTHER",
] as const;

type MemoryCategory =
  (typeof MEMORY_CATEGORIES)[number];

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
    /*
     * BUILD MEMORY CONTEXT
     */
    const memoryContext =
      Array.isArray(memories) &&
      memories.length > 0
        ? memories
            .map(
              (
                memory: {
                  text?: string;
                  category?: string;
                }
              ) =>
                `- ${
                  memory.category
                    ? `[${memory.category}] `
                    : ""
                }${memory.text || ""}`
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

        system: `You are ECHO's memory filter.

Your job is to determine whether the user's message contains useful, non-sensitive information about the user that would be helpful in future conversations.

ONLY save information that is:

- About the user
- Likely to remain useful over time
- A preference
- A hobby
- A project
- A device
- A goal
- Another useful non-sensitive personal fact

DO NOT save:

- Questions
- Requests for help
- Temporary situations
- Random comments
- Jokes
- Instructions
- Information about other people
- Sensitive personal information
- Passwords
- API keys
- Addresses
- Phone numbers
- Private credentials

MEMORY CATEGORIES:

PREFERENCE
Examples:
- User likes blue.
- User prefers black equipment.

HOBBY
Examples:
- User likes Minecraft.
- User enjoys making YouTube videos.

PROJECT
Examples:
- User is building an AI assistant called ECHO.
- User is working on a Minecraft server.

DEVICE
Examples:
- User owns a Quest 2.
- User uses an iPhone.

GOAL
Examples:
- User wants to publish ECHO on the App Store.
- User wants to improve their YouTube channel.

OTHER
Use this only when the information is useful but does not fit the other categories.

EXAMPLE:

User:
"What time is it?"

Return:
NONE

User:
"Can you help me build a Minecraft house?"

Return:
NONE

User:
"I really like Minecraft."

Return:
CATEGORY: HOBBY
MEMORY: User likes Minecraft.

User:
"I am building an AI assistant called ECHO."

Return:
CATEGORY: PROJECT
MEMORY: User is building an AI assistant called ECHO.

EXISTING MEMORIES:

${memoryContext}

Before creating a memory, compare the new information against the existing memories.

If the information is already known or means essentially the same thing as an existing memory, return:

NONE

Different wording does NOT mean it is a new memory.

Only return ONE memory when the information is genuinely new and useful.

Keep the memory short and factual.

Return ONLY one of these formats:

NONE

OR

CATEGORY: PREFERENCE
MEMORY: User prefers black equipment.

OR

CATEGORY: HOBBY
MEMORY: User likes Minecraft.

The category MUST be exactly one of:

PREFERENCE
HOBBY
PROJECT
DEVICE
GOAL
OTHER`,

        prompt: message,
      });

    /*
     * PARSE MEMORY RESULT
     */
    const cleanedMemory =
      memoryAnalysis.trim();

    let suggestedMemory:
      string | null = null;

    let suggestedCategory:
      MemoryCategory | null = null;

    if (
      cleanedMemory &&
      cleanedMemory !== "NONE"
    ) {
      const categoryMatch =
        cleanedMemory.match(
          /CATEGORY:\s*(PREFERENCE|HOBBY|PROJECT|DEVICE|GOAL|OTHER)/i
        );

      const memoryMatch =
        cleanedMemory.match(
          /MEMORY:\s*(.+)/i
        );

      if (categoryMatch) {
        const category =
          categoryMatch[1].toUpperCase();

        if (
          MEMORY_CATEGORIES.includes(
            category as MemoryCategory
          )
        ) {
          suggestedCategory =
            category as MemoryCategory;
        }
      }

      if (memoryMatch) {
        suggestedMemory =
          memoryMatch[1].trim();
      }
    }

    /*
     * RETURN RESPONSE
     */
    return Response.json({
      reply: text,
      suggestedMemory,
      suggestedCategory,
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