const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_COMPOUND_QUERY_CHARS = 600;
const MIN_RETRY_QUERY_CHARS = 300;

function parseCompoundBody(body: string): { parsed: Record<string, unknown>; messages: Array<Record<string, unknown>> } | null {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if ((parsed.model !== "groq/compound" && parsed.model !== "groq/compound-mini") || !Array.isArray(parsed.messages)) return null;
    return { parsed, messages: parsed.messages as Array<Record<string, unknown>> };
  } catch {
    return null;
  }
}

function compactQuery(content: string, maxChars: number): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  const head = Math.max(100, Math.floor(maxChars * 0.7));
  const tail = Math.max(40, maxChars - head - 5);
  return `${normalized.slice(0, head)} ... ${normalized.slice(-tail)}`;
}

function compactCompoundBody(body: string, maxChars = MAX_COMPOUND_QUERY_CHARS): string | null {
  const parsedResult = parseCompoundBody(body);
  if (!parsedResult) return null;

  let changed = false;
  const messages = parsedResult.messages.map((message) => {
    if (message.role !== "user" || typeof message.content !== "string") return message;
    const compacted = compactQuery(message.content, maxChars);
    if (compacted === message.content) return message;
    changed = true;
    return { ...message, content: compacted };
  });

  if (!changed) return null;
  return JSON.stringify({ ...parsedResult.parsed, messages });
}

function makeMinimalRetryBody(body: string): string | null {
  const parsedResult = parseCompoundBody(body);
  if (!parsedResult) return null;

  const messages = parsedResult.messages.map((message) => {
    if (message.role !== "user" || typeof message.content !== "string") return message;
    return { role: "user", content: `Search the web for: ${compactQuery(message.content, 180)}` };
  });

  return JSON.stringify({
    model: "groq/compound-mini",
    messages,
    max_completion_tokens: 512,
    compound_custom: { tools: { enabled_tools: ["web_search"] } },
  });
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

    const compactBody = compactCompoundBody(init.body);
    const firstInit: RequestInit = compactBody ? { ...init, body: compactBody } : init;
    const response = await originalFetch(input, firstInit);

    if (response.status !== 413 || typeof firstInit.body !== "string") return response;

    // Groq documents 413 as Request Entity Too Large. If the normal Compound
    // request is rejected, switch to the single-tool Compound Mini system and
    // send only a tiny web-search query. This removes unnecessary request
    // fields instead of repeatedly resending the same oversized payload.
    const retryBody = makeMinimalRetryBody(firstInit.body);
    if (!retryBody) return response;

    const retryResponse = await originalFetch(input, {
      ...firstInit,
      body: retryBody,
      headers: {
        ...(firstInit.headers || {}),
        "Groq-Model-Version": "latest",
      },
    });

    return retryResponse;
  };
}
