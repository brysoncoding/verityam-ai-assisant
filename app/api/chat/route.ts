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
        system: `You are ECHO's memory filter.
Your job is to determine whether the user's message contains useful, non-sensitive information about the user that would be helpful in future conversations.
ONLY save information that is:
- About the user
- Likely to remain useful over time
- A preference, hobby, interest, device, project, goal, or other useful personal context
GOOD MEMORY EXAMPLES:
"I like Minecraft."
"My favorite game is Minecraft."
"I use a Quest 2."
"I make YouTube videos."
"I work with church audio."
"I like blue."
"I'm building an AI assistant called ECHO."
DO NOT SAVE:
- Questions
- Normal conversation
- Requests for help
- Temporary situations
- Random comments
- Jokes
- Instructions
- Information about other people
- Sensitive personal information
- Passwords, API keys, addresses, phone numbers, or other private credentials
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
User likes Minecraft.
User:
"My favorite game is Minecraft."
Return:
User likes Minecraft.
EXISTING MEMORIES:
${memoryContext}
Before creating a memory, compare the new information against the existing memories.
If the information is already known or means essentially the same thing as an existing memory, return:
NONE
Different wording does NOT make something a new memory.
Only return ONE memory when the information is genuinely new and useful.
Keep the memory short and factual.
Return ONLY:
1. ONE short memory sentence
OR
2. NONE`,
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