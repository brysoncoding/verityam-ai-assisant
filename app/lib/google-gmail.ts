const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

type GmailMessageHeader = { name?: string; value?: string };

type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: GmailMessageHeader[] };
};

type GmailListResponse = { messages?: Array<{ id?: string }>; resultSizeEstimate?: number };

async function gmailFetch<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Google Gmail API request failed");
  return data;
}

export async function searchGoogleGmail(accessToken: string, query: string, maxResults = 8): Promise<GmailMessage[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const list = await gmailFetch<GmailListResponse>(accessToken, `/messages?${params.toString()}`);
  const ids = (list.messages || []).map((message) => message.id).filter((id): id is string => Boolean(id));

  return Promise.all(ids.map((id) => gmailFetch<GmailMessage>(accessToken, `/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)));
}

function header(message: GmailMessage, name: string): string {
  return message.payload?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

export function formatGoogleGmailMessages(messages: GmailMessage[]): string {
  if (messages.length === 0) return "You don't have any matching emails.";

  return messages.map((message, index) => {
    const from = header(message, "From") || "Unknown sender";
    const subject = header(message, "Subject") || "No subject";
    const date = header(message, "Date");
    const snippet = message.snippet?.trim() || "No preview available.";
    return `${index + 1}. ${subject}\n   From: ${from}${date ? `\n   Date: ${date}` : ""}\n   ${snippet}`;
  }).join("\n\n");
}
