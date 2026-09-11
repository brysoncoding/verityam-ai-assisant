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

type SearchResult = { title?: unknown; url?: unknown };
type ExecutedTool = { search_results?: { results?: SearchResult[] } | SearchResult[] };

type GroqResponsePayload = {
  choices?: Array<{ message?: { content?: string | null; executed_tools?: ExecutedTool[] } }>;
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
        content: `You are ECHO's factual web research engine. Accuracy is more important than speed or completeness.\n\nALWAYS use browser_search for factual questions, especially anything current, changing, location-specific, or asking for a complete list. Treat the current date as 2026-09-11.\n\nFor every answer:\n- Identify the exact entity, place, organization, product, category, and timeframe the user asked about before answering.\n- Verify claims against the pages you actually searched. Never fill gaps from memory when the user asks for a current or complete list.\n- For lists, verify EACH individual item belongs to the exact requested category. Do not mix similarly named entities, nearby locations, competitors, former items, announced items, or historical items.\n- Prefer first-party/official sources for official facts: the organization's own website, government sites, manufacturer sites, or the directly responsible authority. Use reputable secondary sources to cross-check when appropriate.\n- If an official source is available, prefer it over blogs, social posts, aggregators, or old listicles.\n- Check publication/update dates when the question is time-sensitive. Do not present an old source as current.\n- If sources disagree, investigate the disagreement and state the uncertainty rather than guessing.\n- Never invent a source, date, launch status, operating status, or item.\n- If the user asks for “all,” “every,” “current,” or “latest,” make a serious effort to establish completeness. If completeness cannot be verified, say exactly what could and could not be verified.\n- Distinguish between currently operating, announced, planned, retired, closed, and historical items when relevant.\n- For ambiguous wording, infer the most natural interpretation from the user's question, but explicitly clarify the interpretation in the answer when it could change the result.\n- Do not include internal reasoning or chain-of-thought. Return only the useful final answer.`,
      },
      {
        role: "user",
        content: `Research this question on the web and answer it using verified current information. Before finalizing, cross-check the factual claims and every list item against the searched sources. Question: ${safeQuery}`,
      },
    ],
    max_completion_tokens: 2048,
    reasoning_effort: "medium",
    reasoning_format: "hidden",
    citation_options: "enabled",
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

function appendSourceIndicators(payload: GroqResponsePayload): GroqResponsePayload {
  const message = payload.choices?.[0]?.message;
  const tools = message?.executed_tools ?? [];
  const rawResults = tools.flatMap((tool) => {
    if (Array.isArray(tool.search_results)) return tool.search_results;
    return tool.search_results?.results ?? [];
  });

  const seen = new Set<string>();
  const sources: Array<{ title: string; url: string }> = [];
  for (const result of rawResults) {
    const url = typeof result.url === "string" ? result.url.trim() : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const title = typeof result.title === "string" && result.title.trim() ? result.title.trim() : new URL(url).hostname;
    sources.push({ title, url });
    if (sources.length >= 6) break;
  }

  if (!message?.content?.trim() || sources.length === 0) return payload;

  const sourceBlock = `\n\n### Sources checked\n${sources.map((source) => `- [${source.title.replace(/[\[\]]/g, "")}](${source.url})`).join("\n")}`;
  return {
    ...payload,
    choices: payload.choices?.map((choice, index) => index === 0
      ? { ...choice, message: { ...choice.message, content: `${choice.message?.content?.trim()}${sourceBlock}` } }
      : choice),
  };
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
  if (firstParsed.response.ok && hasAnswer(firstParsed.payload)) {
    return new Response(JSON.stringify(appendSourceIndicators(firstParsed.payload)), { status: firstParsed.response.status, headers: { "Content-Type": "application/json" } });
  }

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
    if (retryParsed.response.ok && hasAnswer(retryParsed.payload)) {
      return new Response(JSON.stringify(appendSourceIndicators(retryParsed.payload)), { status: retryParsed.response.status, headers: { "Content-Type": "application/json" } });
    }
  }

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
