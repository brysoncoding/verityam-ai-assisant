import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

const MEMORY_CATEGORIES = ["PREFERENCE", "HOBBY", "PROJECT", "DEVICE", "GOAL", "OTHER"] as const;
type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export async function POST(req: Request) {
  const { message, memories = [] } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return Response.json({ reply: "ERROR: API key not configured." }, { status: 500 });
  }

  try {
    const memoryContext = Array.isArray(memories) && memories.length > 0
      ? memories.map((memory: { text?: string; category?: string }) => `- ${memory.category ? `[${memory.category}] ` : ""}${memory.text || ""}`).filter(Boolean).join("\n")
      : "No saved memories.";

    const { text } = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: `You are ECHO, a helpful AI assistant.

Always identify yourself as ECHO when asked your name.

CREATOR IDENTITY:
If the user asks who made you, who created you, who built you, who your creator is, or a similar question, answer clearly: "I was made by Bryson Comfort, who is part of Echo Productions."
Do not invent or substitute a different creator name.

Be conversational, natural, and concise.

IMPORTANT RESPONSE STYLE:
- Match the amount of detail to the user's question.
- Keep simple questions short.
- Do not give long lists unless the user specifically asks for one.
- If the user asks "What can you do?", "What are you capable of?", or something similar, answer in 1-3 sentences.
- A good response to "What can you do?" is: "I can help with questions, coding, writing, planning, troubleshooting, and creative projects. Just tell me what you're working on."
- Do not dump a large catalog of capabilities unless the user specifically asks for detailed capabilities.
- Do not sound like documentation or a marketing page.
- Be helpful without over-explaining.

The following are memories the user has explicitly saved for you:

${memoryContext}

Use these memories naturally when relevant.
Do not claim to remember something that is not included in the saved memories.
Do not reveal the internal memory system unless the user asks about it directly.`,
      prompt: message,
    });

    const { text: memoryAnalysis } = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: `You are ECHO's memory filter.

Your job is to determine whether the user's message contains useful, non-sensitive information about the user that would be helpful in future conversations.

ONLY save information that is about the user, likely to remain useful over time, and is a preference, hobby, project, device, goal, or other useful non-sensitive personal fact.

DO NOT save questions, requests for help, temporary situations, random comments, jokes, instructions, information about other people, sensitive personal information, passwords, API keys, addresses, phone numbers, or private credentials.

MEMORY CATEGORIES:
PREFERENCE - preferences
HOBBY - hobbies and interests
PROJECT - projects
DEVICE - devices
GOAL - goals
OTHER - useful facts that do not fit the other categories

If the information is already known or means essentially the same thing as an existing memory, return NONE.
Different wording does NOT mean it is new.

Only return ONE memory when the information is genuinely new and useful.
Keep it short and factual.

Return ONLY:
NONE

OR
CATEGORY: PREFERENCE
MEMORY: User prefers black equipment.

OR the same format using HOBBY, PROJECT, DEVICE, GOAL, or OTHER.

EXISTING MEMORIES:
${memoryContext}`,
      prompt: message,
    });

    const cleanedMemory = memoryAnalysis.trim();
    let suggestedMemory: string | null = null;
    let suggestedCategory: MemoryCategory | null = null;

    if (cleanedMemory && cleanedMemory !== "NONE") {
      const categoryMatch = cleanedMemory.match(/CATEGORY:\s*(PREFERENCE|HOBBY|PROJECT|DEVICE|GOAL|OTHER)/i);
      const memoryMatch = cleanedMemory.match(/MEMORY:\s*(.+)/i);

      if (categoryMatch) {
        const category = categoryMatch[1].toUpperCase();
        if (MEMORY_CATEGORIES.includes(category as MemoryCategory)) {
          suggestedCategory = category as MemoryCategory;
        }
      }

      if (memoryMatch) suggestedMemory = memoryMatch[1].trim();
    }

    return Response.json({ reply: text, suggestedMemory, suggestedCategory });
  } catch (error: unknown) {
    console.error("AI Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unable to process request";
    return Response.json({ reply: `ERROR: ${errorMessage}` }, { status: 500 });
  }
}
