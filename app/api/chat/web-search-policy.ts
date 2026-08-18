export function shouldSearchWeb(message: string): boolean {
  const lower = message.toLowerCase().trim();

  if (/^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|lol|lmao|good morning|good afternoon|good evening|good night|how are you|what's up|whats up)[!.?]*$/i.test(lower)) {
    return false;
  }

  if (/\b(search|look up|verify|fact[- ]?check|sources?|citations?|research|double[- ]?check|is this true|are you sure|check whether)\b/i.test(lower)) {
    return true;
  }

  const listIntent = /\b(list|show|name|give me|tell me|what are|what's|whats|which)\b/i.test(lower);
  const factualCollection = /\b(rides?|attractions?|parks?|restaurants?|hotels?|stores?|products?|features?|models?|games?|mods?|movies?|shows?|events?|places?|locations?|items?|options?)\b/i.test(lower);
  const namedEntity = /\b(at|in|for|of)\s+\S+(?:\s+\S+){0,8}/i.test(lower);
  if (listIntent && factualCollection && namedEntity) return true;

  if (/\b(current|currently|latest|today|tonight|tomorrow|next day|recent|recently|this week|this month|this year|newest|up[- ]to[- ]date|right now|as of)\b/i.test(lower)) {
    return true;
  }

  if (/\b(price|prices|cost|version|release|released|update|updates|news|score|scores|standings|schedule|hours|open|closed|weather|temperature|population|statistics|stats|law|laws|rule|rules|policy|policies)\b/i.test(lower)) {
    return true;
  }

  if (/\b(who|what|when|where|which|why|how|is|are|was|were|does|do|did|can|should)\b/i.test(lower) && /\?/.test(lower)) {
    return true;
  }

  if (/\b(tell me about|explain|compare|difference between|how much|how many|where can i find)\b/i.test(lower)) {
    return true;
  }

  return false;
}

export function listFormattingInstructions(message: string): string {
  const lower = message.toLowerCase();
  const wantsList = /\b(list|show|name|give me|what are|which)\b/.test(lower);
  if (!wantsList) return "";

  return `LIST FORMAT:
- If the user asks for a list, return a clean Markdown bullet list.
- Put exactly one distinct item on each bullet line.
- Do not combine multiple items into one bullet.
- Do not number a simple list unless the user asks for an order or ranking.
- If the user asks for all items, include every item supported by the sources you found; do not silently invent or omit items.
- If the sources are incomplete, explicitly say the list may be incomplete rather than filling gaps from memory.`;
}
