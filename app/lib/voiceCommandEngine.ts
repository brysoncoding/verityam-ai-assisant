export type VoiceCommandType =
  | "CHAT"
  | "OPEN_HUB"
  | "OPEN_TAB"
  | "TOGGLE_FLOATING"
  | "TOGGLE_VOICE"
  | "CLEAR_MEMORY"
  | "CALENDAR_ADD"
  | "CALENDAR_REMOVE"
  | "CALENDAR_LIST"
  | "MESSAGE"
  | "CALL"
  | "VOICEMAIL_SUMMARY"
  | "UNKNOWN";

export type VoiceCommand = {
  type: VoiceCommandType;
  raw: string;
  tab?: "CHAT" | "MEMORY" | "VOICE" | "SYSTEM" | "SETTINGS";
  enabled?: boolean;
  payload?: string;
  reply?: string;
};

const TAB_ALIASES: Record<string, VoiceCommand["tab"]> = {
  chat: "CHAT",
  home: "CHAT",
  memory: "MEMORY",
  memories: "MEMORY",
  voice: "VOICE",
  system: "SYSTEM",
  settings: "SETTINGS",
  setting: "SETTINGS",
};

function normalize(input: string) {
  return input
    .trim()
    .replace(/^(hey|okay|ok|hi)\s+echo[\s,:-]*/i, "")
    .replace(/^echo[\s,:-]*/i, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts natural-language speech into deterministic ECHO actions.
 * External actions are classified here only; calendar reads are routed through
 * the normal chat API so the connected Google OAuth session can execute them.
 */
export function parseVoiceCommand(input: string): VoiceCommand {
  const raw = input.trim();
  const command = normalize(raw);
  const lower = command.toLowerCase();

  if (!command) return { type: "UNKNOWN", raw };

  if (
    /^(open|show|go to|take me to|bring up)\s+(the\s+)?(hub|menu|navigation)$/i.test(lower) ||
    /^(open|show)\s+(my\s+)?echo\s+hub$/i.test(lower)
  ) {
    return { type: "OPEN_HUB", raw, reply: "Opening the ECHO Hub." };
  }

  const tabMatch = lower.match(
    /^(open|show|go to|take me to|bring up)\s+(the\s+)?(chat|home|memory|memories|voice|system|settings|setting)$/i,
  );
  if (tabMatch) {
    const tab = TAB_ALIASES[tabMatch[3]];
    if (tab) return { type: "OPEN_TAB", raw, tab, reply: `Opening ${tab.toLowerCase()}.` };
  }

  if (
    /^(turn|switch|set)\s+(the\s+)?floating\s+echo\s+(on|enable|enabled)$/i.test(lower) ||
    /^enable\s+(the\s+)?floating\s+echo$/i.test(lower) ||
    /^show\s+(the\s+)?floating\s+echo$/i.test(lower)
  ) {
    return { type: "TOGGLE_FLOATING", raw, enabled: true, reply: "Floating ECHO is on." };
  }

  if (
    /^(turn|switch|set)\s+(the\s+)?floating\s+echo\s+(off|disable|disabled)$/i.test(lower) ||
    /^disable\s+(the\s+)?floating\s+echo$/i.test(lower) ||
    /^hide\s+(the\s+)?floating\s+echo$/i.test(lower)
  ) {
    return { type: "TOGGLE_FLOATING", raw, enabled: false, reply: "Floating ECHO is off." };
  }

  if (
    /^(turn|switch|set)\s+(the\s+)?(voice|voice output|speech)\s+(on|enable|enabled)$/i.test(lower) ||
    /^enable\s+(the\s+)?(voice|speech)$/i.test(lower)
  ) {
    return { type: "TOGGLE_VOICE", raw, enabled: true, reply: "Voice output is on." };
  }

  if (
    /^(turn|switch|set)\s+(the\s+)?(voice|voice output|speech)\s+(off|disable|disabled)$/i.test(lower) ||
    /^disable\s+(the\s+)?(voice|speech)$/i.test(lower)
  ) {
    return { type: "TOGGLE_VOICE", raw, enabled: false, reply: "Voice output is off." };
  }

  if (
    /^(clear|delete|erase)\s+(all\s+)?(my\s+)?memories$/i.test(lower) ||
    /^forget\s+(everything|all\s+my\s+memories)$/i.test(lower)
  ) {
    return { type: "CLEAR_MEMORY", raw, reply: "I can clear your saved memories after confirmation." };
  }

  if (
    /^(what('?s| is)|show|list|check)\s+(on\s+)?(my\s+)?calendar$/i.test(lower) ||
    /^what do i have\s+(on\s+)?(my\s+)?calendar(?:\s+(today|tomorrow|this week))?$/i.test(lower) ||
    /^what('?s| is)\s+(on\s+)?(my\s+)?schedule$/i.test(lower)
  ) {
    return { type: "CHAT", raw, payload: command };
  }

  const addCalendar =
    command.match(/^(?:add|put|schedule|create)\s+(.+?)\s+(?:to|on|in)\s+(?:my\s+)?calendar$/i) ||
    command.match(/^(?:add|put|create)\s+(?:an?\s+)?(?:event|appointment)\s+(.+)$/i) ||
    command.match(/^schedule\s+(.+)$/i);
  if (addCalendar?.[1]) {
    return { type: "CALENDAR_ADD", raw, payload: addCalendar[1].trim(), reply: `I heard the calendar event: ${addCalendar[1].trim()}.` };
  }

  const removeCalendar =
    command.match(/^(?:remove|delete|cancel)\s+(.+?)\s+(?:from|off)\s+(?:my\s+)?calendar$/i) ||
    command.match(/^(?:remove|delete|cancel)\s+(?:the\s+)?(?:calendar\s+)?event\s+(.+)$/i);
  if (removeCalendar?.[1]) {
    return { type: "CALENDAR_REMOVE", raw, payload: removeCalendar[1].trim(), reply: `I heard the calendar item to remove: ${removeCalendar[1].trim()}.` };
  }

  if (
    /^(?:summari[sz]e|read|check|review)\s+(?:my\s+)?voicemail(?:s| messages)?$/i.test(command) ||
    /^(?:summari[sz]e|read|check|review)\s+(?:my\s+)?voice messages$/i.test(command)
  ) {
    return { type: "VOICEMAIL_SUMMARY", raw, reply: "Voicemail summarization is ready to connect." };
  }

  const messageMatch =
    command.match(/^(?:text|message|send a message to)\s+(.+)$/i) ||
    command.match(/^send\s+(.+?)\s+a\s+message$/i);
  if (messageMatch?.[1]) {
    return { type: "MESSAGE", raw, payload: messageMatch[1].trim(), reply: `I heard the message request for ${messageMatch[1].trim()}.` };
  }

  const callMatch = command.match(/^(?:call|phone|dial)\s+(.+)$/i);
  if (callMatch?.[1]) {
    return { type: "CALL", raw, payload: callMatch[1].trim(), reply: `I heard the call request for ${callMatch[1].trim()}.` };
  }

  return { type: "CHAT", raw, payload: command };
}

export function isLocalVoiceCommand(input: string): boolean {
  return parseVoiceCommand(input).type !== "CHAT";
}
