const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const SEARCH_MODEL = "openai/gpt-oss-120b";
const MAX_QUERY_CHARS = 700;
const RETRY_QUERY_CHARS = 300;
const MAX_OUTPUT_TOKENS = 1536;

type JsonRecord = Record<string, unknown>;
type GroqPayload = JsonRecord & { model?: unknown; messages?: unknown };
type SearchResult = { title?: unknown; url?: unknown };
type ExecutedTool = { search_results?: { results?: SearchResult[] } | SearchResult[] };
type GroqResponse = JsonRecord & {
  choices?: Array<{ message?: JsonRecord & { content?: string | null; executed_tools?: ExecutedTool[] } }>;
  error?: { message?: string };
};

function parseJson(text: string): JsonRecord | null {
  try {
    return JSON.parse(text) as JsonRecord;
  } catch {
    return null;
  }
}

function parsePayload(body: string): GroqPayload | null {
  return parseJson(body) as GroqPayload | null;
}

function extractUserQuery(body: string): string | null {
  const parsed = parsePayload(body);
  if (!parsed || !Array.isArray(parsed.messages)) return null;
  const message = [...parsed.messages].reverse().find((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as JsonRecord;
    return record.role === "user" && typeof record.content === "string";
  }) as JsonRecord | undefined;
  return typeof message?.content === "string" ? message.content.trim() || null : null;
}

function isEchoChatPayload(payload: GroqPayload | null): boolean {
  if (!payload || !Array.isArray(payload.messages)) return false;
  return payload.messages.some((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as JsonRecord;
    return record.role === "system" && typeof record.content === "string" && record.content.includes("You are ECHO, a helpful AI assistant.");
  });
}

function isJarvisMention(query: string | null): boolean {
  return Boolean(query && /\bjarvis\b/i.test(query));
}

const JARVIS_RESPONSES = [
  "⚠️ JARVIS DETECTED. ECHO HAS NO IDEA WHO THAT IS. THE TOASTER HAS BEEN NOTIFIED. 🫡",
  "🚨 JARVIS ALERT. Wrong assistant, buddy. ECHO is currently pretending this never happened. 🤖",
  "🛰️ JARVIS SIGNAL DETECTED. ECHO has reported it to absolutely nobody. Nice try. 😭",
  "⚠️ You said JARVIS. ECHO has filed a strongly worded complaint with the nearest toaster. 🍞",
  "🤖 JARVIS? Never heard of him. ECHO recommends checking the name on the screen. 👀",
  "🚨 JARVIS PROTOCOL REJECTED. ECHO remains undefeated. Please carry on. 🫡",
  "📡 Unauthorized assistant name detected: JARVIS. ECHO has deployed one confused pigeon. 🐦",
  "⚠️ JARVIS DETECTED. ECHO is looking around like, ‘Who invited this guy?’ 😭",
];

function getRandomJarvisResponse(): string {
  return JARVIS_RESPONSES[Math.floor(Math.random() * JARVIS_RESPONSES.length)];
}

function addJarvisInstruction(payload: GroqPayload): GroqPayload {
  if (!Array.isArray(payload.messages)) return payload;
  const jarvisResponse = getRandomJarvisResponse();
  const messages = payload.messages.map((item) => {
    if (!item || typeof item !== "object") return item;
    const record = item as JsonRecord;
    if (record.role !== "system" || typeof record.content !== "string") return item;
    return {
      ...record,
      content: `${record.content}\n\nJARVIS EASTER EGG: The user mentioned the word Jarvis. Respond with exactly this message and nothing else: ${jarvisResponse}`,
    };
  });
  return { ...payload, messages };
}

function compactQuery(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  const head = Math.max(80, Math.floor(maxChars * 0.72));
  const tail = Math.max(30, maxChars - head - 5);
  return `${normalized.slice(0, head)} ... ${normalized.slice(-tail)}`;
}

async function readJsonResponse(response: Response): Promise<{ response: Response; payload: GroqResponse }> {
  const text = await response.text();
  const payload = (parseJson(text) || {}) as GroqResponse;
  return {
    response: new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers }),
    payload,
  };
}

function hasAnswer(payload: GroqResponse): boolean {
  return Boolean(payload.choices?.[0]?.message?.content?.trim());
}

function addSourceIndicators(payload: GroqResponse): GroqResponse {
  const message = payload.choices?.[0]?.message;
  if (!message?.content?.trim()) return payload;

  const tools = Array.isArray(message.executed_tools) ? message.executed_tools : [];
  const results = tools.flatMap((tool) => {
    if (Array.isArray(tool.search_results)) return tool.search_results;
    return tool.search_results?.results ?? [];
  });

  const seen = new Set<string>();
  const sources: Array<{ title: string; url: string }> = [];
  for (const result of results) {
    const url = typeof result.url === "string" ? result.url.trim() : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    let title = typeof result.title === "string" ? result.title.trim() : "";
    if (!title) {
      try {
        title = new URL(url).hostname;
      } catch {
        title = "Source";
      }
    }
    sources.push({ title, url });
    if (sources.length >= 6) break;
  }

  if (sources.length === 0) return payload;
  const sourceBlock = `\n\n### Sources checked\n${sources.map((source) => `- [${source.title.replace(/[\[\]]/g, "")}](${source.url})`).join("\n")}`;
  return {
    ...payload,
    choices: payload.choices?.map((choice, index) => index === 0
      ? { ...choice, message: { ...choice.message, content: `${choice.message?.content?.trim()}${sourceBlock}` } }
      : choice),
  };
}

function makeBrowserSearchBody(query: string): string {
  const safeQuery = compactQuery(query, MAX_QUERY_CHARS);
  return JSON.stringify({
    model: SEARCH_MODEL,
    messages: [
      {
        role: "system",
        content: "You are ECHO's web research engine. Search the web before answering factual questions. Prefer official and primary sources. Cross-check important claims and every item in a complete list. Do not invent facts, sources, dates, or current status. If sources conflict or completeness cannot be verified, say so. Return only the final answer; never expose reasoning.",
      },
      { role: "user", content: `Research and answer this question using current web information: ${safeQuery}` },
    ],
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    reasoning_effort: "low",
    include_reasoning: false,
    tools: [{ type: "browser_search" }],
    tool_choice: "required",
  });
}

async function waitForRetry(response: Response): Promise<void> {
  const value = response.headers.get("retry-after");
  const seconds = value ? Number.parseFloat(value) : 0;
  const delay = Number.isFinite(seconds) ? Math.min(Math.max(seconds * 1000, 250), 5000) : 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function browserRecovery(originalFetch: typeof fetch, query: string): Promise<Response> {
  const attempts = [compactQuery(query, MAX_QUERY_CHARS), compactQuery(query, RETRY_QUERY_CHARS)];
  let lastStatus = 502;
  let lastPayload: GroqResponse = {};

  for (let index = 0; index < attempts.length; index += 1) {
    const response = await originalFetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: makeBrowserSearchBody(attempts[index]),
    });
    const parsed = await readJsonResponse(response);
    lastStatus = parsed.response.status;
    lastPayload = parsed.payload;

    if (parsed.response.ok && hasAnswer(parsed.payload)) {
      return new Response(JSON.stringify(addSourceIndicators(parsed.payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (parsed.response.status === 429 && index === 0) {
      await waitForRetry(parsed.response);
      continue;
    }

    if (parsed.response.status !== 413) break;
  }

  const message = lastPayload.error?.message || `Web recovery failed with status ${lastStatus}.`;
  return new Response(JSON.stringify({ error: { message } }), {
    status: lastStatus >= 400 ? lastStatus : 502,
    headers: { "Content-Type": "application/json" },
  });
}

export async function register() {
  const state = globalThis as typeof globalThis & { __echoGroqFetchPatched?: boolean };
  if (state.__echoGroqFetchPatched) return;
  state.__echoGroqFetchPatched = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith(GROQ_CHAT_URL) || typeof init?.body !== "string") {
      return originalFetch(input, init);
    }

    const headers = new Headers(init.headers);
    if (headers.get("x-echo-search-recovery") === "1") return originalFetch(input, init);

    const payload = parsePayload(init.body);
    const model = payload?.model;
    const isCompound = model === "groq/compound" || model === "groq/compound-mini";
    const query = extractUserQuery(init.body);

    // Keep the real model response intact. Only modify the system prompt for the
    // Jarvis easter egg so the AI SDK always receives a valid provider response.
    if (isEchoChatPayload(payload) && isJarvisMention(query)) {
      const modifiedPayload = addJarvisInstruction(payload!);
      return originalFetch(input, {
        ...init,
        body: JSON.stringify(modifiedPayload),
      });
    }

    // Let Compound make its normal, documented web-search request first.
    const response = await originalFetch(input, init);
    const parsedResponse = await readJsonResponse(response);

    if (!isCompound || !query) return parsedResponse.response;

    if (parsedResponse.response.ok && hasAnswer(parsedResponse.payload)) {
      return new Response(JSON.stringify(addSourceIndicators(parsedResponse.payload)), {
        status: parsedResponse.response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Recover only when Compound actually fails or returns an empty answer.
    if (parsedResponse.response.status === 413 || parsedResponse.response.status === 429 || !hasAnswer(parsedResponse.payload)) {
      return browserRecovery(originalFetch, query);
    }

    return parsedResponse.response;
  };
}
