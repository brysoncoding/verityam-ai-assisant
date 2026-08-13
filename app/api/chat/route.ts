import { cookies } from "next/headers";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { decryptGoogleTokens, encryptGoogleTokens, refreshGoogleAccessToken } from "../../lib/google-oauth";
import { formatGoogleCalendarEvents, listGoogleCalendarEvents } from "../../lib/google-calendar";
import { formatGoogleGmailMessages, searchGoogleGmail, sendGoogleGmail } from "../../lib/google-gmail";

const MEMORY_CATEGORIES = ["PREFERENCE", "HOBBY", "PROJECT", "DEVICE", "GOAL", "OTHER"] as const;
type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function isCalendarListRequest(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return /\b(calendar|schedule)\b/.test(lower) && /\b(what|what's|whats|show|list|check|see|view|have|scheduled|events|appointments)\b/.test(lower);
}

function isGmailReadRequest(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const emailWord = /\b(email|emails|mail|gmail|inbox|messages)\b/.test(lower);
  const readIntent = /\b(read|check|show|list|find|search|look|see|have|new|unread|latest|recent|received)\b/.test(lower);
  const sendIntent = /\b(send|write|compose|reply|forward)\b/.test(lower);
  return emailWord && readIntent && !sendIntent;
}

function isGmailSendRequest(message: string): boolean {
  return /\b(send|email|mail)\b/i.test(message) && /\b(to|at)\b/i.test(message) && /@[^\s]+\.[^\s]+/i.test(message);
}

function shouldSearchWeb(message: string): boolean {
  const lower = message.toLowerCase().trim();

  if (/^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|lol|lmao|good morning|good afternoon|good evening|good night|how are you|what's up|whats up)[!.?]*$/i.test(lower)) {
    return false;
  }

  if (/\b(search|look up|verify|fact[- ]?check|sources?|citations?|research|double[- ]?check|is this true|are you sure|check whether)\b/i.test(lower)) {
    return true;
  }

  if (/\b(current|currently|latest|today|tonight|tomorrow|yesterday|recent|recently|this week|this month|this year|newest|up[- ]to[- ]date|right now|as of)\b/i.test(lower)) {
    return true;
  }

  if (/\b(price|prices|cost|version|release|released|update|updates|news|score|scores|standings|schedule|hours|open|closed|weather|temperature|population|statistics|stats|law|laws|rule|rules|policy|policies)\b/i.test(lower)) {
    return true;
  }

  if (/\b(who|what|when|where|which|why|how|is|are|was|were|does|do|did|can|should)\b/i.test(lower) && /\?/.test(lower)) {
    return true;
  }

  if (/\b(tell me about|explain|compare|difference between|how much|how many|where can i find)\b/i.test(lower)) {
    return true;
  }

  return false;
}

function parseGmailSendRequest(message: string): { to: string; subject: string; body: string; topic: string; bodyWasExplicit: boolean } | null {
  const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!emailMatch) return null;
  const to = emailMatch[0];
  const afterEmail = message.slice((emailMatch.index || 0) + to.length).trim();
  const subjectMatch = afterEmail.match(/^(?:subject|with subject)\s*[:=-]\s*(.+?)(?:\s+(?:body|message)\s*[:=-]\s*|\s+say\s*[:=-]\s*)/i);
  if (subjectMatch) {
    const bodyStart = afterEmail.slice(subjectMatch[0].length).trim();
    return { to, subject: subjectMatch[1].trim(), body: bodyStart, topic: bodyStart, bodyWasExplicit: true };
  }
  const sayMatch = afterEmail.match(/\b(?:say|that says|message)\s*[:=-]?\s*(.+)$/i);
  if (sayMatch?.[1]?.trim()) {
    const body = sayMatch[1].trim();
    return { to, subject: "", body, topic: body, bodyWasExplicit: true };
  }
  const topic = afterEmail.replace(/^(?:about|saying)\s*/i, "").trim();
  return { to, subject: "", body: topic, topic, bodyWasExplicit: false };
}

function getUserNameFromMemories(memories: unknown): string | null {
  if (!Array.isArray(memories)) return null;
  const texts = memories
    .filter((memory): memory is { text?: unknown } => typeof memory === "object" && memory !== null)
    .map((memory) => typeof memory.text === "string" ? memory.text.trim() : "")
    .filter(Boolean);

  for (const text of texts) {
    const match = text.match(/\b(?:my name is|my name's|the user's name is|the users name is|call me|my nickname is|the user's nickname is|i go by|user goes by|name is|nickname is)\s+([^.,!?\n]+?)(?:\s*$|[.,!?])/i);
    if (match?.[1]) {
      const name = match[1].trim().replace(/^['"]|['"]$/g, "");
      if (name && !/^\[?your name\]?$/i.test(name)) return name;
    }
  }
  return null;
}

async function writeGmailFromTopic(topic: string, userName: string | null): Promise<{ subject: string; body: string }> {
  const { text } = await generateText({
    model: groq("openai/gpt-oss-120b"),
    system: `You write short, natural emails for ECHO users. Return ONLY valid JSON with exactly two string fields: subject and body. Write the email yourself from the user's topic. Do not invent specific facts, dates, names, promises, or details that the user did not provide. Keep the tone friendly and appropriate to the topic. The body should be ready to send and should not include a subject line.

SIGN-OFF RULES:
- If the user's name or nickname is provided below, end the email with a natural sign-off such as "Best, ${userName || ""}" using that exact name.
- If no user name is provided, do NOT write "[Your Name]", "Your Name", or any invented name. Use a simple sign-off without a placeholder, or omit the sign-off.
- Never use the recipient's name as the sender name.

User name/nickname: ${userName || "NOT PROVIDED"}`,
    prompt: `Write an email about this topic:\n${topic}`,
  });

  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned) as { subject?: unknown; body?: unknown };
    if (typeof parsed.subject === "string" && typeof parsed.body === "string" && parsed.subject.trim() && parsed.body.trim()) {
      const body = userName ? parsed.body.trim() : parsed.body.trim().replace(/\n?\s*(?:Best|Regards|Sincerely|Thanks|Thank you)[,!]?\s*\n\s*(?:\[?Your Name\]?|Your Name)\s*$/i, "").trim();
      return { subject: parsed.subject.trim(), body };
    }
  } catch {
    // Fall back to a safe plain-text interpretation below.
  }

  return { subject: "Message from ECHO", body: cleaned };
}

function getCalendarRange(message: string): { timeMin: string; timeMax: string; label: string } {
  const now = new Date();
  const lower = message.toLowerCase();
  if (/\btomorrow\b/.test(lower)) {
    const start = new Date(now); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { timeMin: start.toISOString(), timeMax: end.toISOString(), label: "tomorrow" };
  }
  if (/\b(this week|week)\b/.test(lower)) {
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay());
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { timeMin: start.toISOString(), timeMax: end.toISOString(), label: "this week" };
  }
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { timeMin: start.toISOString(), timeMax: end.toISOString(), label: "today" };
}

function getGmailQuery(message: string): string {
  const lower = message.toLowerCase();
  if (/\bunread\b/.test(lower) || /\bnew\b/.test(lower)) return "is:unread";
  if (/\btoday\b/.test(lower)) return "after:" + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "/");
  return "in:anywhere";
}

async function getGoogleAccessToken(): Promise<{ accessToken: string; cookieStore: Awaited<ReturnType<typeof cookies>> }> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("echo-google-tokens")?.value;
  if (!tokenCookie) throw new Error("NOT_CONNECTED");
  const storedTokens = await decryptGoogleTokens(tokenCookie);
  if (storedTokens.expiresAt > Date.now() + 60_000) return { accessToken: storedTokens.accessToken, cookieStore };
  if (!storedTokens.refreshToken) throw new Error("RECONNECT_REQUIRED");
  const refreshed = await refreshGoogleAccessToken(storedTokens.refreshToken);
  const accessToken = refreshed.access_token;
  const updatedTokens = await encryptGoogleTokens({ accessToken, refreshToken: storedTokens.refreshToken, expiresAt: Date.now() + refreshed.expires_in * 1000 });
  cookieStore.set("echo-google-tokens", updatedTokens, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return { accessToken, cookieStore };
}

async function getGoogleCalendarReply(message: string): Promise<{ reply: string; status: number }> {
  try {
    const { accessToken } = await getGoogleAccessToken();
    const range = getCalendarRange(message);
    const events = await listGoogleCalendarEvents(accessToken, range.timeMin, range.timeMax);
    return { reply: `Here’s your Google Calendar for ${range.label}:\n${formatGoogleCalendarEvents(events)}`, status: 200 };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_CONNECTED") return { reply: "I don’t have access to your Google Calendar yet. Connect Google in ECHO Permissions first.", status: 401 };
    if (error instanceof Error && error.message === "RECONNECT_REQUIRED") return { reply: "Your Google Calendar connection needs to be renewed. Please reconnect Google in ECHO Permissions.", status: 401 };
    console.error("Google Calendar Error:", error);
    return { reply: "I couldn’t read your Google Calendar. Try reconnecting Google in ECHO Permissions.", status: 502 };
  }
}

async function getGoogleGmailReply(message: string): Promise<{ reply: string; status: number }> {
  try {
    const { accessToken } = await getGoogleAccessToken();
    const messages = await searchGoogleGmail(accessToken, getGmailQuery(message));
    return { reply: `Here are your latest Gmail messages:\n\n${formatGoogleGmailMessages(messages)}`, status: 200 };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_CONNECTED") return { reply: "I don’t have access to your Gmail yet. Connect Google in ECHO Permissions first.", status: 401 };
    if (error instanceof Error && error.message === "RECONNECT_REQUIRED") return { reply: "Your Google connection needs to be renewed. Please reconnect Google in ECHO Permissions so ECHO can read Gmail.", status: 401 };
    console.error("Google Gmail Error:", error);
    return { reply: "I couldn’t read your Gmail. Make sure Gmail access is approved in Google and then reconnect Google in ECHO Permissions.", status: 502 };
  }
}

async function sendGmailReply(message: string, memories: unknown): Promise<{ reply: string; status: number }> {
  const request = parseGmailSendRequest(message);
  if (!request) return { reply: "Tell me who to send the email to, using their email address, and what you want it to be about.", status: 400 };
  if (!request.topic) return { reply: "Tell me what you want the email to be about, and I’ll write it for you.", status: 400 };

  try {
    const { accessToken } = await getGoogleAccessToken();
    const userName = getUserNameFromMemories(memories);
    const draft = request.bodyWasExplicit
      ? { subject: request.subject || "Message from ECHO", body: request.body }
      : await writeGmailFromTopic(request.topic, userName);
    await sendGoogleGmail(accessToken, request.to, draft.subject, draft.body);
    return { reply: `Done — I wrote and sent the email to ${request.to}.`, status: 200 };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_CONNECTED") return { reply: "I don’t have access to your Gmail yet. Connect Google in ECHO Settings first.", status: 401 };
    if (error instanceof Error && error.message === "RECONNECT_REQUIRED") return { reply: "Your Google connection needs to be renewed. Please reconnect Google in ECHO Settings.", status: 401 };
    if (error instanceof Error && error.message === "INVALID_RECIPIENT") return { reply: "That recipient email address doesn't look valid. Please check it and try again.", status: 400 };
    console.error("Google Gmail Send Error:", error);
    return { reply: "I couldn’t send that email through Gmail. Make sure Gmail sending access is approved and reconnect Google if needed.", status: 502 };
  }
}

async function generateEchoResponse(message: string, memoryContext: string): Promise<string> {
  const system = `You are ECHO, a helpful AI assistant.

Always identify yourself as ECHO when asked your name.

CREATOR IDENTITY:
If the user asks who made you, who created you, who built you, who your creator is, or a similar question, answer clearly: "I was made by Bryson Comfort, who is part of Echo Productions."
Do not invent or substitute a different creator name.

FACT ACCURACY RULES:
- If the user asks for facts, current information, niche information, verification, sources, or anything that may have changed, use the web-search tool when it is provided.
- Never pretend you searched when you did not.
- Never present a guess as a verified fact.
- If search results conflict or are weak, say so instead of confidently choosing an unsupported answer.
- Prefer primary or authoritative sources when possible.
- When web sources are used, keep the answer grounded in those sources and preserve the citations returned by Groq.

RESPONSE STYLE:
- Be conversational, natural, and concise.
- Match the amount of detail to the user's question.
- Use short paragraphs.
- For multiple items, use clean Markdown bullet lists with one item per line.
- Use numbered lists only for steps, rankings, or ordered sequences.
- Do not cram several facts into one paragraph.
- Do not give long lists unless the user asks for one.
- Do not sound like documentation or a marketing page.

The following are memories the user has explicitly saved for you:

${memoryContext}

Use these memories naturally when relevant.
Do not claim to remember something that is not included in the saved memories.
Do not reveal the internal memory system unless the user asks about it directly.`;

  if (shouldSearchWeb(message)) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: message },
        ],
        tools: [{ type: "browser_search" }],
        tool_choice: "required",
        citation_options: "enabled",
        reasoning_effort: "low",
        temperature: 0.2,
        max_completion_tokens: 4096,
      }),
    });

    const payload = (await response.json()) as GroqChatResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message || "Web search failed.");
    }

    const searchedText = payload.choices?.[0]?.message?.content?.trim();
    if (!searchedText) throw new Error("Web search returned no answer.");
    return searchedText;
  }

  const { text } = await generateText({
    model: groq("openai/gpt-oss-120b"),
    system,
    prompt: message,
  });
  return text;
}

async function analyzeMemory(message: string, memoryContext: string): Promise<{ suggestedMemory: string | null; suggestedCategory: MemoryCategory | null }> {
  const { text } = await generateText({
    model: groq("openai/gpt-oss-120b"),
    system: `You are ECHO's memory filter. Determine whether the user's message contains useful, non-sensitive information about the user that would help in future conversations.

ONLY save information that is:
- About the user
- Likely to remain useful over time
- A preference, hobby, project, device, goal, or other useful non-sensitive personal fact

DO NOT save:
- Questions
- Requests for help
- Temporary situations
- Random comments or jokes
- Instructions
- Information about other people
- Sensitive personal information
- Passwords, API keys, addresses, phone numbers, or private credentials

Existing memories:
${memoryContext}

If the information is already known or means essentially the same thing as an existing memory, return NONE.
Different wording does not make something new.

Return ONLY one of:
NONE
CATEGORY: PREFERENCE|HOBBY|PROJECT|DEVICE|GOAL|OTHER
MEMORY: <one short factual sentence>`,
    prompt: message,
  });

  const cleaned = text.trim();
  if (!cleaned || /^NONE$/i.test(cleaned)) return { suggestedMemory: null, suggestedCategory: null };

  const categoryMatch = cleaned.match(/CATEGORY:\s*(PREFERENCE|HOBBY|PROJECT|DEVICE|GOAL|OTHER)/i);
  const memoryMatch = cleaned.match(/MEMORY:\s*(.+)/i);
  if (!memoryMatch?.[1]) return { suggestedMemory: null, suggestedCategory: null };

  const suggestedMemory = memoryMatch[1].trim();
  const suggestedCategory = categoryMatch?.[1]?.toUpperCase() as MemoryCategory | undefined;
  return { suggestedMemory, suggestedCategory: suggestedCategory || "OTHER" };
}

export async function POST(req: Request) {
  const { message, memories = [] } = await req.json();

  if (typeof message !== "string" || !message.trim()) {
    return Response.json({ reply: "Please give me something to work with." }, { status: 400 });
  }

  if (isCalendarListRequest(message)) {
    const result = await getGoogleCalendarReply(message);
    return Response.json({ reply: result.reply, suggestedMemory: null, suggestedCategory: null }, { status: result.status });
  }

  if (isGmailSendRequest(message)) {
    const result = await sendGmailReply(message, memories);
    return Response.json({ reply: result.reply, suggestedMemory: null, suggestedCategory: null }, { status: result.status });
  }

  if (isGmailReadRequest(message)) {
    const result = await getGoogleGmailReply(message);
    return Response.json({ reply: result.reply, suggestedMemory: null, suggestedCategory: null }, { status: result.status });
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json({ reply: "ERROR: API key not configured." }, { status: 500 });
  }

  try {
    const memoryContext = Array.isArray(memories) && memories.length > 0
      ? memories
          .map((memory: { text?: string; category?: string }) => `- ${memory.category ? `[${memory.category}] ` : ""}${memory.text || ""}`)
          .filter(Boolean)
          .join("\n")
      : "No saved memories.";

    const reply = await generateEchoResponse(message, memoryContext);
    const memoryResult = await analyzeMemory(message, memoryContext);

    return Response.json({
      reply,
      suggestedMemory: memoryResult.suggestedMemory,
      suggestedCategory: memoryResult.suggestedCategory,
    });
  } catch (error: unknown) {
    console.error("AI Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unable to process request";
    return Response.json({ reply: `ERROR: ${errorMessage}` }, { status: 500 });
  }
}
