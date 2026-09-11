const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_COMPOUND_QUERY_CHARS = 600;
const MIN_RETRY_QUERY_CHARS = 300;
const EMPTY_RESPONSE_FALLBACK_MODEL = "openai/gpt-oss-120b";

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
    ? `Answer the user's question using the web-search evidence below. Give only the final answer, with no reasoning or internal analysis.\n\nUser question:\n${query}\n\nWeb-search evidence:\n${evidence}`
    : `Answer the user's question as accurately as possible. Give only the final answer, with no reasoning or internal analysis. If the question needs current information and no web evidence is available, clearly say that verification was unavailable.\n\nUser question:\n${query}`;

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

    // Compound can return HTTP 200 while content is empty. Recover from the
    // executed web-search evidence instead of returning an empty UI bubble.
    if (!content && getUserQuery(firstInit.body || "")) {
      const query = getUserQuery(firstInit.body || "") || "the user's question";
      const evidence = extractToolEvidence(firstParsed.payload);
      const fallback = await synthesizeEmptyCompoundResponse(query, evidence);
      if (fallback) return fallback;
    }

    return firstParsed.response;
  };
}
