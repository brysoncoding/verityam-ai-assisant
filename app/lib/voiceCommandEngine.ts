export type VoiceCommandType =
  | "CHAT"
  | "OPEN_HUB"
  | "OPEN_TAB"
  | "TOGGLE_FLOATING"
  | "TOGGLE_VOICE"
  | "CLEAR_MEMORY"
  | "UNKNOWN";

export type VoiceCommand = {
  type: VoiceCommandType;
  raw: string;
  tab?: "CHAT" | "MEMORY" | "VOICE" | "SYSTEM" | "SETTINGS";
  enabled?: boolean;
  reply?: string;
};

const TAB_ALIASES: Record<string, VoiceCommand["tab"]> = {
  chat: "CHAT",
  memory: "MEMORY",
  memories: "MEMORY",
  voice: "VOICE",
  system: "SYSTEM",
  settings: "SETTINGS",
};

/**
 * Converts natural-language ECHO commands into small, safe UI actions.
 * It deliberately does not perform phone calls, texts, calendar changes,
 * or other external actions. Those capabilities can be connected later
 * through platform-specific integrations.
 */
export function parseVoiceCommand(input: string): VoiceCommand {
  const raw = input.trim();
  const command = raw.toLowerCase().replace(/[.!?]+$/g, "").trim();

  if (!command) {
    return { type: "UNKNOWN", raw };
  }

  if (/^(open|show|go to|take me to)\s+(the\s+)?(hub|menu|navigation)$/.test(command)) {
    return { type: "OPEN_HUB", raw, reply: "Opening the ECHO Hub." };
  }

  const tabMatch = command.match(
    /^(open|show|go to|take me to)\s+(the\s+)?(chat|memory|memories|voice|system|settings)$/
  );
  if (tabMatch) {
    const tab = TAB_ALIASES[tabMatch[3]];
    if (tab) {
      return { type: "OPEN_TAB", raw, tab, reply: `Opening ${tab.toLowerCase()}.` };
    }
  }

  if (/^(turn|switch|set)\s+(the\s+)?floating\s+echo\s+(on|enable|enabled)$/.test(command)) {
    return { type: "TOGGLE_FLOATING", raw, enabled: true, reply: "Floating ECHO is on." };
  }
  if (/^(turn|switch|set)\s+(the\s+)?floating\s+echo\s+(off|disable|disabled)$/.test(command)) {
    return { type: "TOGGLE_FLOATING", raw, enabled: false, reply: "Floating ECHO is off." };
  }

  if (/^(turn|switch|set)\s+(voice|voice output)\s+(on|enable|enabled)$/.test(command)) {
    return { type: "TOGGLE_VOICE", raw, enabled: true, reply: "Voice output is on." };
  }
  if (/^(turn|switch|set)\s+(voice|voice output)\s+(off|disable|disabled)$/.test(command)) {
    return { type: "TOGGLE_VOICE", raw, enabled: false, reply: "Voice output is off." };
  }

  if (/^(clear|delete|erase)\s+(all\s+)?(my\s+)?memories$/.test(command)) {
    return { type: "CLEAR_MEMORY", raw, reply: "I can clear your saved memories after confirmation." };
  }

  return { type: "CHAT", raw };
}

export function isLocalVoiceCommand(input: string): boolean {
  return parseVoiceCommand(input).type !== "CHAT";
}
