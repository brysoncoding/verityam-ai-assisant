const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_COMPOUND_QUERY_CHARS = 600;
const MIN_RETRY_QUERY_CHARS = 300;

function parseCompoundBody(body: string): { parsed: Record<string, unknown>; messages: Array<Record<string, unknown>> } | null {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (parsed.model !== "groq/compound" || !Array.isArray(parsed.messages)) return null;
    return { parsed, messages: parsed.messages as Array<Record<string, unknown>> };
  } catch {
    return null;
  }
}

function compactQuery(content: string, maxChars: number): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  const head = Math.max(180, Math.floor(maxChars * 0.78));
  const tail = Math.max(50, maxChars - head - 5);
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

    // Groq documents HTTP 413 as Request Entity Too Large. Retry once with a
    // deliberately tiny query so a provider-side web-search limit cannot leak
    // through to ECHO as an error for long pasted prompts.
    const retryBody = compactCompoundBody(firstInit.body, MIN_RETRY_QUERY_CHARS);
    if (!retryBody || retryBody === firstInit.body) return response;

    return originalFetch(input, { ...firstInit, body: retryBody });
  };
}
