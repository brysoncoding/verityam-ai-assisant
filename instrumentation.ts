const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const WEB_MODEL = "openai/gpt-oss-120b";
const MAX_SEARCH_CHARS = 700;
const RETRY_SEARCH_CHARS = 260;
const FALLBACK_OUTPUT_TOKENS = 768;

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
  const head = Math.max(100, Math.floor(maxChars * 0.72));
  const tail = Math.max(40, maxChars - head - 5);
  return `${normalized.slice(0, head)} ... ${normalized.slice(-tail)}`;
}

function buildSearchRequest(query: string): string {
  const safeQuery = compactQuery(query, MAX_SEARCH_CHARS);
  return JSON.stringify({
    model: WEB_MODEL,
    messages: [
      {
        role: "system",
        content: `You are ECHO's factual web research engine. Accuracy is more important than speed or completeness.

ALWAYS use browser_search for factual questions, especially anything current, changing, location-specific, or asking for a complete list. Treat the current date as 2026-09-11.

For every answer:
- Identify the exact entity, place, organization, product, category, and timeframe the user asked about before answering.
- Verify claims against the pages you actually searched. Never fill gaps from memory when the user asks for a current or complete list.
- For lists, verify EACH individual item belongs to the exact requested category. Do not mix similarly named entities, nearby locations, competitors, former items, announced items, or historical items.
- Prefer first-party/official sources for official facts: the organization's own website, government sites, manufacturer sites, or the directly responsible authority. Use reputable secondary sources to cross-check when appropriate.
- If an official source is available, prefer it over blogs, social posts, aggregators, or old listicles.
- Check publication/update dates when the question is time-sensitive. Do not present an old source as current.
- If sources disagree, investigate the disagreement and state the uncertainty rather than guessing.
- Never invent a source, date, launch status, operating status, or item.
- If the user asks for “all,” “every,” “current,” or “latest,” make a serious effort to establish completeness. If completeness cannot be verified, say exactly what could and could not be verified.
- Distinguish between currently operating, announced, planned, retired, closed, and historical items when relevant.
- For ambiguous wording, infer the most natural interpretation from the user's question, but explicitly clarify the interpretation in the answer when it could change the result.
- Do not include internal reasoning or chain-of-thought. Return only the useful final answer with concise source/citation references when available.`,
      },
      {
        role: "user",
        content: `Research this question on the web and answer it using verified current information. Before finalizing, cross-check the factual claims and every list item against the searched sources. Question: ${safeQuery}`,
      },
    ],
    max_completion_tokens: 2048,
    reasoning_effort: "medium",
    reasoning_format: "hidden",
    tools: [{ type: "browser_search" }],
    tool_choice: "required",
  });
}

function buildPlainFallbackRequest(query: string): string {
  return JSON.stringify({
    model: WEB_MODEL,
    messages: [
      {
        role: "system",
        content: "Answer factual questions carefully. Do not invent facts or sources. If current verification is unavailable, clearly say that you cannot verify the current information. Do not show reasoning.",
      },
      {
        role: "user",
        content: `Answer this question directly: ${compactQuery(query, RETRY_SEARCH_CHARS)}`,
      },
    ],
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
    // Use a fresh browser-search request with a high-capability model instead.
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
