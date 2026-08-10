import { cookies } from "next/headers";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { decryptGoogleTokens, encryptGoogleTokens, refreshGoogleAccessToken } from "../../lib/google-oauth";
import { formatGoogleCalendarEvents, listGoogleCalendarEvents } from "../../lib/google-calendar";
import { formatGoogleGmailMessages, searchGoogleGmail, sendGoogleGmail } from "../../lib/google-gmail";

const MEMORY_CATEGORIES = ["PREFERENCE", "HOBBY", "PROJECT", "DEVICE", "GOAL", "OTHER"] as const;
type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

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
    const match = text.match(/\b(?:my name is|call me|my nickname is|i go by)\s+([^.,!?\n]+?)(?:\s*$|[.,!?])/i);
    if (match?.[1]) return match[1].trim().replace(/^['"]|['"]$/g, "");
  }
  return null;
}

async function writeGmailFromTopic(topic: string, userName: string | null): Promise<{ subject: string; body: string }> {
  const { text } = await generateText({
    model: groq("openai/gpt-oss-120b"),
    system: `You write short, natural emails for ECHO users. Return ONLY valid JSON with exactly two string fields: subject and body. Write the email yourself from the user's topic. Do not invent specific facts, dates, names, promises, or details that the user did not provide. Keep the tone friendly and appropriate to the topic. The body should be ready to send and should not include a subject line.\n\nSIGN-OFF RULES:\n- If the user's name or nickname is provided below, end the email with a natural sign-off such as "Best, ${userName || ""}" using that exact name.\n- If no user name is provided, do NOT write "[Your Name]", "Your Name", or any invented name. Use a simple sign-off without a placeholder, or omit the sign-off.\n- Never use the recipient's name as the sender name.\n\nUser name/nickname: ${userName || "NOT PROVIDED"}`,
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

export async function POST(req: Request) {
  const { message, memories = [] } = await req.json();
  if (typeof message !== "string" || !message.trim()) return Response.json({ reply: "Please give me something to work with." }, { status: 400 });
  if (isCalendarListRequest(message)) { const result = await getGoogleCalendarReply(message); return Response.json({ reply: result.reply, suggestedMemory: null, suggestedCategory: null }, { status: result.status }); }
  if (isGmailSendRequest(message)) { const result = await sendGmailReply(message, memories); return Response.json({ reply: result.reply, suggestedMemory: null, suggestedCategory: null }, { status: result.status }); }
  if (isGmailReadRequest(message)) { const result = await getGoogleGmailReply(message); return Response.json({ reply: result.reply, suggestedMemory: null, suggestedCategory: null }, { status: result.status }); }
  if (!process.env.GROQ_API_KEY) return Response.json({ reply: "ERROR: API key not configured." }, { status: 500 });
  try {
    const memoryContext = Array.isArray(memories) && memories.length > 0 ? memories.map((memory: { text?: string; category?: string }) => `- ${memory.category ? `[${memory.category}] ` : ""}${memory.text || ""}`).filter(Boolean).join("\n") : "No saved memories.";
    const { text } = await generateText({ model: groq("openai/gpt-oss-120b"), system: `You are ECHO, a helpful AI assistant.\n\nAlways identify yourself as ECHO when asked your name.\n\nCREATOR IDENTITY:\nIf the user asks who made you, who created you, who built you, who your creator is, or a similar question, answer clearly: "I was made by Bryson Comfort, who is part of Echo Productions."\nDo not invent or substitute a different creator name.\n\nBe conversational, natural, and concise.\n\nIMPORTANT RESPONSE STYLE:\n- Match the amount of detail to the user's question.\n- Keep simple questions short.\n- Do not give long lists unless the user specifically asks for one.\n- If the user asks "What can you do?", "What are you capable of?", or something similar, answer in 1-3 sentences.\n- Do not sound like documentation or a marketing page.\n- Be helpful without over-explaining.\n\nThe following are memories the user has explicitly saved for you:\n\n${memoryContext}\n\nUse these memories naturally when relevant.\nDo not claim to remember something that is not included in the saved memories.\nDo not reveal the internal memory system unless the user asks about it directly.`, prompt: message });
    const { text: memoryAnalysis } = await generateText({ model: groq("openai/gpt-oss-120b"), system: `You are ECHO's memory filter. Determine whether the user's message contains useful, non-sensitive information about the user that would help in future conversations. ONLY save information that is about the user, likely to remain useful, and is a preference, hobby, project, device, goal, or other useful non-sensitive personal fact. DO NOT save questions, temporary situations, random comments, jokes, instructions, information about other people, sensitive personal information, passwords, API keys, addresses, phone numbers, or private credentials. Return ONLY NONE or CATEGORY: <category> MEMORY: <short factual memory>. If the information is already known, return NONE. EXISTING MEMORIES:\n${memoryContext}`, prompt: message });
    const cleanedMemory = memoryAnalysis.trim();
    let suggestedMemory: string | null = null;
    let suggestedCategory: MemoryCategory | null = null;
    if (cleanedMemory && cleanedMemory !== "NONE") {
      const categoryMatch = cleanedMemory.match(/CATEGORY:\s*(PREFERENCE|HOBBY|PROJECT|DEVICE|GOAL|OTHER)/i);
      const memoryMatch = cleanedMemory.match(/MEMORY:\s*(.+)/i);
      if (categoryMatch) suggestedCategory = categoryMatch[1].toUpperCase() as MemoryCategory;
      if (memoryMatch) suggestedMemory = memoryMatch[1].trim();
    }
    return Response.json({ reply: text, suggestedMemory, suggestedCategory });
  } catch (error: unknown) {
    console.error("AI Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unable to process request";
    return Response.json({ reply: `ERROR: ${errorMessage}` }, { status: 500 });
  }
}
