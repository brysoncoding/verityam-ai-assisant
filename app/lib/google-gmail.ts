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
type GmailApiError = { error?: { code?: number; status?: string; message?: string; errors?: Array<{ reason?: string; message?: string }> } };

export class GmailAccessError extends Error {
  readonly code?: number;
  readonly status?: string;
  readonly reason?: string;
  constructor(message: string, details?: { code?: number; status?: string; reason?: string }) {
    super(message);
    this.name = "GmailAccessError";
    this.code = details?.code;
    this.status = details?.status;
    this.reason = details?.reason;
  }
}

async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = (await response.json()) as T & GmailApiError;
  if (!response.ok) {
    const apiError = data.error;
    throw new GmailAccessError(apiError?.message || `Google Gmail API request failed (${response.status})`, {
      code: apiError?.code ?? response.status,
      status: apiError?.status,
      reason: apiError?.errors?.[0]?.reason,
    });
  }
  return data;
}

export async function searchGoogleGmail(accessToken: string, query: string, maxResults = 8): Promise<GmailMessage[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const list = await gmailFetch<GmailListResponse>(accessToken, `/messages?${params.toString()}`);
  const ids = (list.messages || []).map((message) => message.id).filter((id): id is string => Boolean(id));
  return Promise.all(ids.map((id) => gmailFetch<GmailMessage>(accessToken, `/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)));
}

export async function sendGoogleGmail(accessToken: string, to: string, subject: string, body: string): Promise<void> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("INVALID_RECIPIENT");
  const rawMessage = [`To: ${to}`, `Subject: ${subject || ""}`, "Content-Type: text/plain; charset=UTF-8", "", body].join("\r\n");
  const encoded = Buffer.from(rawMessage, "utf8").toString("base64url");
  await gmailFetch(accessToken, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
}

function header(message: GmailMessage, name: string): string {
  return message.payload?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

function senderName(from: string): string {
  const trimmed = from.trim();
  if (!trimmed) return "Unknown sender";
  const nameMatch = trimmed.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  if (nameMatch?.[1]) return nameMatch[1].trim();
  const addressOnly = trimmed.match(/^([^@\s]+)@[^\s>]+$/);
  return addressOnly?.[1] || trimmed;
}

export function formatGoogleGmailMessages(messages: GmailMessage[]): string {
  if (messages.length === 0) return "You don't have any matching emails.";
  const senders = messages.map((message) => senderName(header(message, "From")));
  const uniqueSenders = [...new Set(senders)];
  if (uniqueSenders.length === 1) return `Your latest email is from ${uniqueSenders[0]}.`;
  if (uniqueSenders.length <= 5) return `Your latest emails are from ${uniqueSenders.join(", ")}.`;
  return `Your latest emails are from ${uniqueSenders.slice(0, 5).join(", ")}, and ${uniqueSenders.length - 5} others.`;
}
