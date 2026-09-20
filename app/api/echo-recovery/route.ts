const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_RECOVERY_CHARS = 12000;

type GroqPayload = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

function cleanAnswer(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();
}

function limitText(text: string): string {
  if (text.length <= MAX_RECOVERY_CHARS) return text;
  return `${text.slice(0, 9000)}\n\n[Long request shortened for recovery]\n\n${text.slice(-3000)}`;
}

async function callGroq(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; payload: GroqPayload }> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.Groq}`,
      "x-echo-recovery": "1",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: GroqPayload = {};
  try {
    payload = JSON.parse(text) as GroqPayload;
  } catch {
    payload = {};
  }
  return { ok: response.ok, status: response.status, payload };
}

export async function POST(req: Request) {
  if (!process.env.Groq) {
    return Response.json({ reply: "ERROR: API key not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => null) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return Response.json({ reply: "I need a question to search for." }, { status: 400 });

  const question = limitText(message);
  const system = "You are ECHO. Return only the final answer to the user's question. Never output chain-of-thought, reasoning, hidden analysis, or a Reasoning section. Use current web information when the question needs it. If web search is unavailable, clearly say that verification was unavailable rather than inventing current facts.";

  try {
    // Recovery path intentionally bypasses Compound. GPT-OSS 120B has native
    // browser_search support and a 131K context window, giving ECHO a separate
    // web-search path when Compound is empty or rejected.
    const searched = await callGroq({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
      tools: [{ type: "browser_search" }],
      tool_choice: "required",
      include_reasoning: false,
      max_completion_tokens: 2048,
    });

    const searchedText = cleanAnswer(searched.payload.choices?.[0]?.message?.content || "");
    if (searched.ok && searchedText) {
      return Response.json({ reply: searchedText, suggestedMemory: null, suggestedCategory: null, recovered: true });
    }

    // Final non-web fallback guarantees that a transient browser-search failure
    // cannot become a blank assistant bubble.
    const plain = await callGroq({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
      include_reasoning: false,
      max_completion_tokens: 2048,
    });

    const plainText = cleanAnswer(plain.payload.choices?.[0]?.message?.content || "");
    if (plain.ok && plainText) {
      return Response.json({ reply: plainText, suggestedMemory: null, suggestedCategory: null, recovered: true });
    }

    const groqError = searched.payload.error?.message || plain.payload.error?.message || `Groq recovery failed (HTTP ${searched.status || plain.status || 502}).`;
    return Response.json({ reply: `ERROR: ${groqError}`, suggestedMemory: null, suggestedCategory: null }, { status: 502 });
  } catch (error) {
    console.error("ECHO recovery error:", error);
    return Response.json({ reply: "ERROR: ECHO could not generate a response. Please try again.", suggestedMemory: null, suggestedCategory: null }, { status: 502 });
  }
}
