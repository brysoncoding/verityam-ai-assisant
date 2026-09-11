const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const WEB_MODEL = "openai/gpt-oss-20b";
const MAX_SEARCH_CHARS = 500;
const RETRY_SEARCH_CHARS = 200;
const FALLBACK_OUTPUT_TOKENS = 512;

type GroqPayload = {
  model?: unknown;
  messages?: unknown;
  [key: string]: unknown;
};

type GroqResponsePayload = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
  [key: string]: unknown;
};

function parseBody(body: string): GroqPayload | null {
  try {
    return JSON.parse(body) as GroqPayload;
  } catch {
    return null;
  }
}

function extractUserQuery(body: string): string | null {
  const parsed = parseBody(body);
  if (!parsed || !Array.isArray(parsed.messages)) return null;
  const message = [...parsed.messages].reverse().find(
    (item) => item && typeof item === "object" && (item as { role?: unknown }).role === "user" && typeof (item as { content?: unknown }).content === "string",
  ) as { content?: string } | undefined;
  return message?.content?.trim() || null;
}

function compactQuery(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  const head = Math.max(80, Math.floor(maxChars * 0.72));
  const tail = Math.max(30, maxChars - head - 5);
  return `${normalized.slice(0, head)} ... ${normalized.slice(-tail)}`;
}

function buildSearchRequest(query: string): string {
  const safeQuery = compactQuery(query, MAX_SEARCH_CHARS);
  return JSON.stringify({
    model: WEB_MODEL,
    messages: [{
      role: "user",
      content: `Search the web and answer this question using current information. For lists, verify every item belongs to the exact place or category asked about. Do not use outdated or unrelated items. Return only the final answer, with no reasoning. Question: ${safeQuery}`,
    }],
    max_completion_tokens: 1024,
    reasoning_effort: "low",
    reasoning_format: "hidden",
    tools: [{ type: "browser_search" }],
    tool_choice: "required",
  });
}

function buildPlainFallbackRequest(query: string): string {
  return JSON.stringify({
    model: WEB_MODEL,
    messages: [{
      role: "user",
      content: `Answer this question directly. Do not show reasoning. If current verification is unavailable, say so clearly. Question: ${compactQuery(query, RETRY_SEARCH_CHARS)}`,
    }],
    max_completion_tokens: FALLBACK_OUTPUT_TOKENS,
    reasoning_effort: "low",
    reasoning_format: "hidden",
  });
}

async function readResponse(response: Response): Promise<{ response: Response; payload: GroqResponsePayload }> {
  const text = await response.text();
  let payload: GroqResponsePayload = {};
  try {
    payload = JSON.parse(text) as GroqResponsePayload;
  } catch {
    // Keep an empty payload for non-JSON upstream responses.
  }
  return {
    payload,
    response: new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers }),
  };
}

function hasAnswer(payload: GroqResponsePayload): boolean {
  return Boolean(payload.choices?.[0]?.message?.content?.trim());
}

async function requestMinimalSearch(originalFetch: typeof fetch, query: string): Promise<Response> {
  const first = await originalFetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: buildSearchRequest(query),
  });
  const firstParsed = await readResponse(first);
  if (firstParsed.response.ok && hasAnswer(firstParsed.payload)) return firstParsed.response;

  if (firstParsed.response.status === 413) {
    const retry = await originalFetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: buildSearchRequest(compactQuery(query, RETRY_SEARCH_CHARS)),
    });
    const retryParsed = await readResponse(retry);
    if (retryParsed.response.ok && hasAnswer(retryParsed.payload)) return retryParsed.response;
  }

  // Last resort: return a real model response instead of propagating a 413 into the UI.
  const fallback = await originalFetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "x-echo-search-fallback": "1",
    },
    body: buildPlainFallbackRequest(query),
  });
  return fallback;
}

export async function register() {
  const globalState = globalThis as typeof globalThis & { __echoGroqFetchPatched?: boolean };
  if (globalState.__echoGroqFetchPatched) return;
  globalState.__echoGroqFetchPatched = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith(GROQ_CHAT_URL) || typeof init?.body !== "string") {
      return originalFetch(input, init);
    }

    const headers = new Headers(init.headers);
    if (headers.get("x-echo-search-fallback") === "1") return originalFetch(input, init);

    const parsed = parseBody(init.body);
    const isCompound = parsed?.model === "groq/compound" || parsed?.model === "groq/compound-mini";
    const query = extractUserQuery(init.body);

    // Never forward the original Compound payload. It may contain the entire
    // chat history, memories, tool configuration, or other large fields.
    // Groq's GPT-OSS models natively support browser_search, so use a fresh,
    // tiny request instead.
    if (isCompound && query) {
      return requestMinimalSearch(originalFetch, query);
    }

    const response = await originalFetch(input, init);
    const parsedResponse = await readResponse(response);
    if (parsedResponse.response.status === 413 && query) {
      return requestMinimalSearch(originalFetch, query);
    }
    return parsedResponse.response;
  };
}
