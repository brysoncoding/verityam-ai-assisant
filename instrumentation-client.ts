/**
 * ECHO client-side response safety net.
 *
 * If /api/chat returns an empty answer, an oversized-request error, or a web
 * search failure, retry the user's actual question through the independent
 * /api/echo-recovery route. That route uses Groq's native browser_search path
 * instead of Compound, so the recovery path cannot reproduce the same failure.
 */

const ORIGINAL_FETCH = window.fetch.bind(window);
const RECOVERY_HEADER = "x-echo-response-recovery";
const CHAT_PATH = "/api/chat";
const RECOVERY_PATH = "/api/echo-recovery";

function isPath(input: RequestInfo | URL, path: string): boolean {
  try {
    const url = typeof input === "string"
      ? new URL(input, window.location.origin)
      : new URL(input instanceof Request ? input.url : input.toString(), window.location.origin);
    return url.pathname === path;
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
  return /web search request|request entity too large|too large for groq|rejected as too large|web search returned no answer/i.test(reply) || !reply.trim();
}

async function getOriginalChatMessage(input: RequestInfo | URL, init?: RequestInit): Promise<string | null> {
  try {
    const body = init?.body;
    if (typeof body === "string") {
      const parsed = JSON.parse(body) as { message?: unknown };
      return typeof parsed.message === "string" && parsed.message.trim() ? parsed.message.trim() : null;
    }

    if (input instanceof Request) {
      const text = await input.clone().text();
      const parsed = JSON.parse(text) as { message?: unknown };
      return typeof parsed.message === "string" && parsed.message.trim() ? parsed.message.trim() : null;
    }
  } catch {
    // Keep the original response if the request body cannot be recovered.
  }
  return null;
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!isPath(input, CHAT_PATH) || (init?.headers && new Headers(init.headers).has(RECOVERY_HEADER))) {
    return ORIGINAL_FETCH(input, init);
  }

  const response = await ORIGINAL_FETCH(input, init);
  const data = await readJson(response);

  if (!shouldRecover(response, data)) return response;

  const message = await getOriginalChatMessage(input, init);
  if (!message) return response;

  try {
    // Do not retry /api/chat. That was the failing path. Send only the actual
    // user question to the independent browser-search recovery endpoint.
    const recoveryResponse = await ORIGINAL_FETCH(RECOVERY_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [RECOVERY_HEADER]: "1",
      },
      body: JSON.stringify({ message }),
    });

    const recoveryData = await readJson(recoveryResponse);
    if (hasUsableReply(recoveryData)) return recoveryResponse;
  } catch {
    // Fall through to a deterministic non-blank response below.
  }

  return new Response(JSON.stringify({
    reply: "I couldn't generate a response this time. Please try sending the question again.",
    suggestedMemory: null,
    suggestedCategory: null,
    recovered: true,
  }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
};
