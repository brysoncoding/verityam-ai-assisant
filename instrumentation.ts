const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_COMPOUND_QUERY_CHARS = 800;

function compactCompoundBody(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as {
      model?: unknown;
      messages?: Array<{ role?: unknown; content?: unknown }>;
    };

    if (parsed.model !== "groq/compound" || !Array.isArray(parsed.messages)) return null;

    let changed = false;
    const messages = parsed.messages.map((message) => {
      if (message.role !== "user" || typeof message.content !== "string") return message;
      const normalized = message.content.replace(/\s+/g, " ").trim();
      if (normalized.length <= MAX_COMPOUND_QUERY_CHARS) return message;

      changed = true;
      // Keep both the beginning and end so long requests retain the main topic
      // and any dates, versions, or constraints placed at the end.
      const head = 650;
      const tail = MAX_COMPOUND_QUERY_CHARS - head - 5;
      return {
        ...message,
        content: `${normalized.slice(0, head)} ... ${normalized.slice(-tail)}`,
      };
    });

    if (!changed) return null;
    return JSON.stringify({ ...parsed, messages });
  } catch {
    return null;
  }
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
    if (!compactBody) return originalFetch(input, init);

    const compactInit: RequestInit = { ...init, body: compactBody };
    return originalFetch(input, compactInit);
  };
}
