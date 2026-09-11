const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_COMPOUND_QUERY_CHARS = 600;
const MIN_RETRY_QUERY_CHARS = 300;
const EMPTY_RESPONSE_FALLBACK_MODEL = "openai/gpt-oss-120b";
const WEB_SEARCH_MODEL = "openai/gpt-oss-120b";

type CompoundPayload = {
  model?: unknown;
  messages?: unknown;
  [key: string]: unknown;
};

type GroqResponsePayload = {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning?: string | null;
      executed_tools?: Array<Record<string, unknown>>;
    };
  }>;
  error?: { message?: string };
  [key: string]: unknown;
};

function parseCompoundBody(body: string): { parsed: CompoundPayload; messages: Array<Record<string, unknown>> } | null {
  try {
    const parsed = JSON.parse(body) as CompoundPayload;
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

function isListOrCollectionQuery(query: string): boolean {
  return /\b(list|all|every|each|which|what are|show|rides?|attractions?|restaurants?|hotels?|stores?|options?|features?|items?)\b/i.test(query);
}

function getSearchSettings(query: string): Record<string, unknown> | undefined {
  const lower = query.toLowerCase();
  if (/\b(disney|disney world|walt disney|hollywood studios|magic kingdom|epcot|animal kingdom)\b/.test(lower)) {
    return { include_domains: ["disneyworld.disney.go.com"], country: "united states" };
  }
  if (/\b(universal studios|universal orlando|islands of adventure)\b/.test(lower)) {
    return { include_domains: ["universalorlando.com"], country: "united states" };
  }
  if (/\b(seaworld|sea world)\b/.test(lower)) {
    return { include_domains: ["seaworld.com"], country: "united states" };
  }
  return undefined;
}

function buildGroundedQuery(query: string): string {
  const base = compactQuery(query, MAX_COMPOUND_QUERY_CHARS);
  if (!isListOrCollectionQuery(base)) return base;
  return compactQuery(
    `${base} Verify every item against current authoritative sources. Only include items that belong to the exact place or category named in the question. Do not mix locations, closed attractions, former names, or outdated information.`,
    MAX_COMPOUND_QUERY_CHARS,
  );
}

function buildCompoundRequest(body: string, model = WEB_SEARCH_MODEL): string | null {
  const parsedResult = parseCompoundBody(body);
  if (!parsedResult) return null;
  const query = getUserQuery(body);
  if (!query) return null;
  const groundedQuery = buildGroundedQuery(query);
  const messages = [{
    role: "system",
    content: "You are ECHO's factual web research engine. Use current web evidence before answering factual questions. For lists, verify every item belongs to the exact place/category asked about. Never fill missing items from memory. Prefer authoritative primary sources. If sources are incomplete or conflicting, say so. Return only the final answer; do not expose reasoning.",
  }, { role: "user", content: groundedQuery }];
  const searchSettings = getSearchSettings(query);
  const request: Record<string, unknown> = {
    ...parsedResult.parsed,
    model,
    messages,
    max_completion_tokens: 4096,
    citation_options: "enabled",
    include_reasoning: false,
    tools: [{ type: "browser_search" }],
    tool_choice: "required",
  };
  delete request.compound_custom;
  if (searchSettings) request.search_settings = searchSettings;
  return JSON.stringify(request);
}

function compactCompoundBody(body: string, maxChars = MAX_COMPOUND_QUERY_CHARS): string | null {
  const parsedResult = parseCompoundBody(body);
  if (!parsedResult) return null;
  const query = getUserQuery(body);
  if (!query) return null;
  const compacted = buildGroundedQuery(query);
  if (compacted === query && parsedResult.parsed.compound_custom) return null;
  return buildCompoundRequest(body, WEB_SEARCH_MODEL);
}

function makeMinimalRetryBody(body: string): string | null {
  const parsedResult = parseCompoundBody(body);
  if (!parsedResult) return null;
  const query = getUserQuery(body);
  if (!query) return null;
  const minimalQuery = compactQuery(query, MIN_RETRY_QUERY_CHARS);
  const request = JSON.parse(buildCompoundRequest(body, WEB_SEARCH_MODEL) || "{}");
  request.messages = [{
    role: "user",
    content: `Search the web and answer this question using current authoritative sources. Verify every listed item belongs to the exact place/category asked about. Do not include outdated or unrelated items. Question: ${minimalQuery}`,
  }];
  request.max_completion_tokens = 1024;
  request.tools = [{ type: "browser_search" }];
  request.tool_choice = "required";
  delete request.compound_custom;
  return JSON.stringify(request);
}

function getUserQuery(body: string): string | null {
  const parsed = parseCompoundBody(body);
  if (!parsed) return null;
  const userMessage = [...parsed.messages].reverse().find((message) => message.role === "user" && typeof message.content === "string");
  return userMessage && typeof userMessage.content === "string" ? userMessage.content : null;
}

function extractToolEvidence(payload: GroqResponsePayload): string {
  const tools = payload.choices?.[0]?.message?.executed_tools;
  if (!Array.isArray(tools) || tools.length === 0) return "";

  const evidence = tools
    .map((tool) => {
      const output = typeof tool.output === "string" ? tool.output : "";
      const searchResults = typeof tool.search_results === "string" ? tool.search_results : "";
      const title = typeof tool.title === "string" ? tool.title : "";
      return [title, output, searchResults].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  return compactQuery(evidence, 12000);
}

async function readGroqResponse(response: Response): Promise<{ response: Response; payload: GroqResponsePayload }> {
  const text = await response.text();
  let payload: GroqResponsePayload = {};
  try {
    payload = JSON.parse(text) as GroqResponsePayload;
  } catch {
    payload = {};
  }
  return {
    payload,
    response: new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
  };
}

async function synthesizeEmptyCompoundResponse(query: string, evidence: string): Promise<Response | null> {
  const prompt = evidence
    ? `Answer the user's question using only the current web-search evidence below. Verify that every listed item belongs to the exact place/category asked about. Do not add items from memory or from other locations. If the evidence is incomplete, say so. Give only the final answer, with no reasoning.\n\nUser question:\n${query}\n\nWeb-search evidence:\n${evidence}`
    : `Answer the user's question as accurately as possible. Give only the final answer, with no reasoning. If the question needs current information and no web evidence is available, clearly say that verification was unavailable.\n\nUser question:\n${query}`;

  const fallback = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "x-echo-empty-fallback": "1",
    },
    body: JSON.stringify({
      model: EMPTY_RESPONSE_FALLBACK_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2048,
      include_reasoning: false,
    }),
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

    if (init.headers && new Headers(init.headers).get("x-echo-empty-fallback") === "1") {
      return originalFetch(input, init);
    }

    const compactBody = compactCompoundBody(init.body);
    const firstInit: RequestInit = compactBody ? { ...init, body: compactBody } : init;
    const response = await originalFetch(input, firstInit);
    const firstParsed = await readGroqResponse(response);

    if (firstParsed.response.status === 413 && typeof firstInit.body === "string") {
      const retryBody = makeMinimalRetryBody(firstInit.body);
      if (retryBody) {
        const retry = await originalFetch(input, {
          ...firstInit,
          body: retryBody,
          headers: {
            ...(firstInit.headers || {}),
            "Groq-Model-Version": "latest",
          },
        });
        const retryParsed = await readGroqResponse(retry);
        if (retryParsed.response.ok) {
          const retryText = retryParsed.payload.choices?.[0]?.message?.content?.trim();
          if (retryText) return retryParsed.response;
          const retryQuery = getUserQuery(retryBody) || "the user's question";
          const retryEvidence = extractToolEvidence(retryParsed.payload);
          const fallback = await synthesizeEmptyCompoundResponse(retryQuery, retryEvidence);
          if (fallback) return fallback;
        }
        return retryParsed.response;
      }
    }

    if (!firstParsed.response.ok) return firstParsed.response;

    const message = firstParsed.payload.choices?.[0]?.message;
    const content = message?.content?.trim();

    if (!content && getUserQuery(firstInit.body || "")) {
      const query = getUserQuery(firstInit.body || "") || "the user's question";
      const evidence = extractToolEvidence(firstParsed.payload);
      const fallback = await synthesizeEmptyCompoundResponse(query, evidence);
      if (fallback) return fallback;
    }

    return firstParsed.response;
  };
}
