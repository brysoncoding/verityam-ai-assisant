/**
 * ECHO client-side response safety net.
 *
 * Next.js loads instrumentation-client before React hydration, which makes it
 * a good place for a lightweight global fetch guard. This does not change
 * successful responses; it only recovers from an empty / oversized / malformed
 * /api/chat response so the UI can never render a blank ECHO bubble.
 */

const ORIGINAL_FETCH = window.fetch.bind(window);
const RECOVERY_HEADER = "x-echo-response-recovery";
const CHAT_PATH = "/api/chat";

function isChatRequest(input: RequestInfo | URL): boolean {
  try {
    const url = typeof input === "string" ? new URL(input, window.location.origin) : new URL(input instanceof Request ? input.url : input.toString(), window.location.origin);
    return url.pathname === CHAT_PATH;
  } catch {
    return false;
  }
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return await response.clone().json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasUsableReply(data: Record<string, unknown> | null): boolean {
  return typeof data?.reply === "string" && data.reply.trim().length > 0;
}

function shouldRecover(response: Response, data: Record<string, unknown> | null): boolean {
  if (response.status === 413) return true;
  if (hasUsableReply(data)) return false;
  const reply = typeof data?.reply === "string" ? data.reply : "";
  return /web search request|request entity too large|too large for groq|rejected as too large/i.test(reply) || !reply.trim();
}

async function getOriginalChatBody(input: RequestInfo | URL, init?: RequestInit): Promise<{ message: string } | null> {
  try {
    const body = init?.body;
    if (typeof body === "string") {
      const parsed = JSON.parse(body) as { message?: unknown };
      return typeof parsed.message === "string" && parsed.message.trim() ? { message: parsed.message.trim() } : null;
    }

    if (input instanceof Request) {
      const text = await input.clone().text();
      const parsed = JSON.parse(text) as { message?: unknown };
      return typeof parsed.message === "string" && parsed.message.trim() ? { message: parsed.message.trim() } : null;
    }
  } catch {
    // Let the original request/error surface normally if the body cannot be read.
  }
  return null;
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!isChatRequest(input) || init?.headers && new Headers(init.headers).has(RECOVERY_HEADER)) {
    return ORIGINAL_FETCH(input, init);
  }

  const response = await ORIGINAL_FETCH(input, init);
  const data = await readJson(response);

  if (!shouldRecover(response, data)) return response;

  const original = await getOriginalChatBody(input, init);
  if (!original) return response;

  try {
    // Retry with only the user's actual question. Saved memories and any
    // pasted context are intentionally omitted to reduce request size.
    const retryResponse = await ORIGINAL_FETCH(CHAT_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [RECOVERY_HEADER]: "1",
      },
      body: JSON.stringify({ message: original.message, memories: [] }),
    });

    const retryData = await readJson(retryResponse);
    if (hasUsableReply(retryData)) return retryResponse;
  } catch {
    // Fall through to a deterministic non-blank response below.
  }

  const fallback = {
    reply: "I couldn't generate a response this time. Please try sending the question again.",
    suggestedMemory: null,
    suggestedCategory: null,
    recovered: true,
  };

  return new Response(JSON.stringify(fallback), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
};
