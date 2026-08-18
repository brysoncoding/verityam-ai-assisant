const GOOGLE_CALENDAR_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
};

type GoogleCalendarResponse = {
  items?: GoogleCalendarEvent[];
  error?: { message?: string };
};

type GoogleCalendarCreateResponse = GoogleCalendarEvent & {
  error?: { message?: string };
};

export async function listGoogleCalendarEvents(accessToken: string, timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "50" });
  const response = await fetch(`${GOOGLE_CALENDAR_ENDPOINT}?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const data = (await response.json()) as GoogleCalendarResponse;
  if (!response.ok) throw new Error(data.error?.message || "Google Calendar request failed");
  return data.items || [];
}

export async function createGoogleCalendarEvent(accessToken: string, event: {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
}): Promise<GoogleCalendarEvent> {
  const response = await fetch(GOOGLE_CALENDAR_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
    cache: "no-store",
  });
  const data = (await response.json()) as GoogleCalendarCreateResponse;
  if (!response.ok || !data.id) throw new Error(data.error?.message || "Google Calendar event creation failed");
  return data;
}

export function formatGoogleCalendarEvents(events: GoogleCalendarEvent[]): string {
  if (events.length === 0) return "You have no calendar events in that time period.";
  return events.map((event) => {
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    const title = event.summary?.trim() || "Untitled event";
    const details = event.location?.trim() ? ` — ${event.location.trim()}` : "";
    if (!start) return `• ${title}${details}`;
    if (event.start?.date) return `• ${title} — all day${details}`;
    const startLabel = new Date(start).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const endLabel = end ? new Date(end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    return `• ${title} — ${startLabel}${endLabel ? `–${endLabel}` : ""}${details}`;
  }).join("\n");
}
