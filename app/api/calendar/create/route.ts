import { cookies } from "next/headers";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { createGoogleCalendarEvent } from "../../../lib/google-calendar";
import { decryptGoogleTokens, encryptGoogleTokens, refreshGoogleAccessToken } from "../../../lib/google-oauth";

async function getGoogleAccessToken() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("echo-google-tokens")?.value;
  if (!tokenCookie) throw new Error("NOT_CONNECTED");

  const storedTokens = await decryptGoogleTokens(tokenCookie);
  if (storedTokens.expiresAt > Date.now() + 60_000) return storedTokens.accessToken;
  if (!storedTokens.refreshToken) throw new Error("RECONNECT_REQUIRED");

  const refreshed = await refreshGoogleAccessToken(storedTokens.refreshToken);
  const accessToken = refreshed.access_token;
  const updatedTokens = await encryptGoogleTokens({
    accessToken,
    refreshToken: storedTokens.refreshToken,
    expiresAt: Date.now() + refreshed.expires_in * 1000,
  });

  cookieStore.set("echo-google-tokens", updatedTokens, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return accessToken;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { message?: unknown; timeZone?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const timeZone = typeof body?.timeZone === "string" && body.timeZone.trim() ? body.timeZone : "UTC";

  if (!message) return Response.json({ reply: "Tell me what you want to add to your calendar." }, { status: 400 });
  if (!process.env.GROQ_API_KEY) return Response.json({ reply: "Calendar creation is not configured yet." }, { status: 500 });

  try {
    const now = new Date();
    const { text } = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: `You extract calendar events from a user's natural-language request. Return ONLY valid JSON with exactly these fields: title (string), description (string), start (string), end (string), allDay (boolean). Use RFC3339 date-time strings for timed events and YYYY-MM-DD for all-day events. The user's time zone is ${timeZone}. Current UTC time is ${now.toISOString()}. Interpret relative dates such as today and tomorrow in the user's time zone. If the user gives a start time but no end time, use a 1-hour duration. If the request is clearly an all-day event, set allDay true. Do not invent a specific date or time when the request does not contain enough information; instead return empty start and end strings. Keep the title short and natural.`,
      prompt: message,
    });

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(cleaned) as { title?: unknown; description?: unknown; start?: unknown; end?: unknown; allDay?: unknown };
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    const start = typeof parsed.start === "string" ? parsed.start.trim() : "";
    const end = typeof parsed.end === "string" ? parsed.end.trim() : "";
    const allDay = parsed.allDay === true;

    if (!title || !start || !end) {
      return Response.json({ reply: "I need a date and time before I can add that to your calendar. For example, say: ‘Add study time tomorrow at 4 PM for one hour.’" }, { status: 400 });
    }

    const accessToken = await getGoogleAccessToken();
    const event = allDay
      ? await createGoogleCalendarEvent(accessToken, {
          summary: title,
          ...(description ? { description } : {}),
          start: { date: start, timeZone },
          end: { date: end, timeZone },
        })
      : await createGoogleCalendarEvent(accessToken, {
          summary: title,
          ...(description ? { description } : {}),
          start: { dateTime: start, timeZone },
          end: { dateTime: end, timeZone },
        });

    return Response.json({ reply: `Done — I added “${event.summary || title}” to your Google Calendar.`, event });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_CONNECTED") return Response.json({ reply: "I don’t have access to your Google Calendar yet. Connect Google in ECHO Permissions first." }, { status: 401 });
    if (error instanceof Error && error.message === "RECONNECT_REQUIRED") return Response.json({ reply: "Your Google Calendar connection needs to be renewed. Please reconnect Google in ECHO Permissions." }, { status: 401 });
    console.error("Google Calendar Create Error:", error);
    return Response.json({ reply: "I couldn’t add that to Google Calendar. Please reconnect Google in ECHO Permissions and try again." }, { status: 502 });
  }
}
